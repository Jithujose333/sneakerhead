const Order = require('../../models/orderSchema')
const Product = require('../../models/productSchema')
const Cart = require('../../models/cartSchema')
const User = require('../../models/userSchema')
const Address = require('../../models/addressSchema')
const Razorpay = require('razorpay');
const dotenv = require('dotenv').config();
const crypto = require('crypto');
const Wallet = require('../../models/walletSchema')
var instance = new Razorpay({
  key_id: process.env.Razorpay_Id,
  key_secret: process.env.Razorpay_Secret_key,
});



const placeOrder = async (req, res, next) => {
    try {
        const userId = req.session.user._id;

        if (!userId) {
            return res.status(401).json({ message: 'User not authenticated' });
        }

        const { addressId, paymentMethod, couponApplied} = req.body;

        // Validate the selected address
        const selectedAddress = await Address.findById(addressId);
        if (!selectedAddress) {
            return res.status(400).json({ message: 'Invalid address selected' });
        }

        // Check the payment method
        if (!['COD', 'Card Payment','Wallet'].includes(paymentMethod)) {
            return res.status(400).json({ message: 'Invalid payment method selected' });
        }

        // Fetch the cart details
        const cart = await Cart.findOne({ userId }).populate('items.productId');
        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ message: 'Cart is empty' });
        }

         
       
       if(paymentMethod==="Wallet"){
        const wallet = await Wallet.findOne({ userId: req.session.user._id }); 
       
       const cartTotalPrice= cart.items.reduce((acc,total)=>acc+=total.totalPrice,0) 
        if(wallet.walletBalance < cartTotalPrice){
        return res.status(400).json({ message: 'Insufficient wallet balance' });
            }
       }


        for (const item of cart.items) {
            const product = await Product.findById(item.productId);
            if (!product) {
                return res.status(404).json({ message: `Product with ID ${item.productId} not found.` });
            }
        
            const size = item.size;
            // Find the size object that matches the selected size
            const sizeObject = product.sizes.find(s => s.size === size);
        
            if (!sizeObject) {
                return res.status(400).json({ message: `Size ${size} not available for ${product.productName}.` });
            }
        
            if (item.quantity > sizeObject.quantity) {
                return res.status(400).json({ message: `Not enough stock for ${product.productName}. Available: ${sizeObject.quantity}` });
            }
        
        
            // Check if the size is out of stock
            if (product.sizes.reduce((acc,totalquantity)=>acc+=totalquantity,0)  === 0) {
                product.status = 'out of stock';
            }
            
           
        }
      

        const orderedItems = cart.items.map(item => ({
            product: item.productId._id,
            size: item.size,
            quantity: item.quantity,
            price: item.price,
            itemStatus:'Pending',
            itemPaymentStatus:'Pending'
        }));

        // Calculate the total price
        let totalPrice = 0;
        cart.items.forEach(item => {
            totalPrice += item.price * item.quantity;
        });
      let discount = totalPrice*cart.discount/100
        // Apply discount if available
        const finalAmount = discount ? totalPrice - discount : totalPrice;

        // Directly store address data in the order without referencing
        const address = {
            name: selectedAddress.name,
            houseName: selectedAddress.houseName,
            city: selectedAddress.city,
            locality: selectedAddress.locality || " ",
            state: selectedAddress.state,
            pincode: selectedAddress.pincode,
            phone: selectedAddress.phone,
            altPhone: selectedAddress.altPhone || " "
        };

        // Create a new order in the database
        const newOrder = new Order({
            userId,
            orderedItems,
            totalPrice,
            finalAmount,
            discount: discount || 0,
            paymentMethod,
            address,
            orderStatus: 'Pending',
            paymentStatus: 'Pending',
            couponApplied: discount>0?true:false,
            couponPercentage:cart.discount
        });

        await newOrder.save();

        // Razorpay Payment (Card Payment)
        if (paymentMethod === 'Card Payment') {
            const finalAmountPaise = parseInt(finalAmount) * 100; // Convert to paise

            const razorpayOrder = await instance.orders.create({
                amount: finalAmountPaise,
                currency: 'INR',
                receipt: `order_rcptid_${newOrder._id}`,
            });

            if (!razorpayOrder) {
                // Handle error in creating Razorpay order
                newOrder.orderStatus = 'Failed';
                newOrder.paymentStatus = 'Failed';
                await newOrder.save();

                return res.status(500).json({ message: 'Error creating Razorpay order' });
            }

            // Update the Razorpay order ID in the database
            newOrder.razorpayOrderId = razorpayOrder.id;
            await newOrder.save();

            // Send Razorpay order details to the frontend
            return res.json({
                orderId: razorpayOrder.id,
                amount: razorpayOrder.amount,
                currency: razorpayOrder.currency,
                key: process.env.Razorpay_Id,
                name: 'Sneakerhead',
                description: 'Payment for your order',
                prefill: {
                    name: req.session.user.name,
                    email: req.session.user.email,
                    contact: selectedAddress.phone,
                }
            });
        } else {
            
   

            for (const item of cart.items) {
                const product = await Product.findById(item.productId);
                const size = item.size;
                // Find the size object that matches the selected size
                const sizeObject = product.sizes.find(s => s.size === size);
            // Update the quantity
            sizeObject.quantity -= item.quantity;

            await product.save(); 
            }

            if(paymentMethod==="Wallet"){

                const wallet = await Wallet.findOne({ userId: req.session.user._id }); 

                wallet.walletBalance -= newOrder.finalAmount
                newOrder.orderStatus = "Processing"
                newOrder.paymentStatus = "Completed"


                newOrder.orderedItems.forEach(item => {
                    item.itemStatus = "Processing";
                    item.itemPaymentStatus = "Completed"
                });
                await newOrder.save();

                wallet.transactions.push({
                    type: 'debit',
                    amount: newOrder.finalAmount,
                    description: `Placed order of ${newOrder.orderId}`
                });
                await wallet.save()

                
           
            }


            await Cart.deleteOne({ userId });
            const orderId = newOrder.orderId;
           return res.json({
                success: true,
                message: 'Order placed successfully!',
                redirectUrl: `/order-complete/${orderId}`
            });
        }
    } catch (error) {
        console.error('Error placing order:', error);
        next(error)
    }

}




const verifyPayment = async (req, res, next) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    try {
        // Generate the signature using Razorpay secret key
        const generatedSignature = crypto.createHmac('sha256', process.env.Razorpay_Secret_key)
            .update(razorpay_order_id + "|" + razorpay_payment_id)
            .digest('hex');

        // Find the order associated with this Razorpay order ID
        const order = await Order.findOne({ razorpayOrderId: razorpay_order_id });

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        if (generatedSignature === razorpay_signature) {
            // Payment is valid
            // Update the order status and payment status




            order.orderStatus = 'Processing';
            order.paymentStatus = 'Completed';



            
            order.orderedItems.forEach(item => {
                item.itemStatus = "Processing";
                item.itemPaymentStatus = "Completed"
            });
            
            await order.save();

          const cart=  await Cart.findOne({ userId: order.userId });
          

        
     

        for (const item of cart.items) {
            const product = await Product.findById(item.productId);
            const size = item.size;
            // Find the size object that matches the selected size
            const sizeObject = product.sizes.find(s => s.size === size);
        // Update the quantity
        sizeObject.quantity -= item.quantity;

        await product.save(); 
        }
            
            await Cart.deleteOne({ userId: order.userId });

            
            res.json({ success: true, message: 'Payment verified and cart items deleted' });
        } else {
            // Payment verification failed
            order.orderStatus = 'Failed';
            order.paymentStatus = 'Failed';
            await order.save();

            res.status(400).json({ success: false, message: 'Invalid signature, payment verification failed' });
        }
    } catch (error) {
        console.error('Error verifying payment:', error);
        next(error)
    }
};





const orderConfirmationPage = async (req, res, next) => {
    try {
        const { id } = req.params; 
       

        // Try to fetch the order by orderId first
        let order = await Order.findOne({ orderId: id });

        // If not found, try fetching by razorpayOrderId
        if (!order) {
            order = await Order.findOne({ razorpayOrderId: id });
        }

       
        if (!order) {
            return res.status(404).redirect('/pageNotFound');
        }
  
     
      return res.render("order-complete", {
        firstName: req.firstName,
        orderId: order.orderId, 
      });
    } catch (error) {
      console.error('Error fetching order:', error); 
      next(error)
    }
  };
  
const getOrders = async (req, res,next) => {
    try {
        const userId = req.session.user;
        const orders = await Order.find({ userId }).populate('orderedItems.product'); // Ensure products are populated
        
        res.render('user-orders', {
            firstName: req.firstName,
            orders: orders,
            user:req.session.user
        });
    } catch (error) {
        console.error("Error fetching orders:", error);
      next(error)
    }
}






const userCancelOrder = async (req, res, next) => {
    try {
        
        const itemId = req.params.id;
        const reason = req.body.reason;
        
        const order = await Order.findOne({ "orderedItems._id": itemId });
 
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        // Find the item in the order
        const item = order.orderedItems.find(item => item._id.toString() === itemId);
   
        if (!item) {
            return res.status(404).json({ success: false, message: 'Item not found in the order' });
        }

        // Check item status
        if (item.itemStatus === 'Cancelled') {
            return res.status(400).json({ success: false, message: 'Item is already cancelled' });
        }

       
        

        if (item.itemStatus === 'Return Request') {
        
            item.itemStatus = 'Delivered';
            item.reason = reason
            await order.save();
            return res.status(200).json({ success: true, message: 'Return Request cancelled' });
        }

        // Cancel the item
        item.itemStatus = 'Cancelled';
        item.reason = reason

        // Update product stock for the cancelled item
        const product = await Product.findById(item.product);
        if (product) {
            const sizeEntry = product.sizes.find(s => s.size === item.size);
            if (sizeEntry) {
                sizeEntry.quantity += item.quantity;
            } else {
                console.log(`Size ${item.size} not found for product ${item.product}`);
            }
            await product.save();
        }

        // If the payment method is "Card Payment" or "Wallet", update wallet balance
        if ((order.paymentMethod === "Card Payment" || order.paymentMethod === "Wallet") && item.paymentStatus !== "Refunded") {
            const wallet = await Wallet.findOne({ userId: req.session.user._id });
             var discountedPrice = 0
            if(order.couponApplied===true){
               var discountedPrice =(item.price* item.quantity)*order.couponPercentage/100;
            }
            if (wallet) {
                wallet.walletBalance +=  (item.price * item.quantity)-discountedPrice;
                wallet.transactions.push({
                    type: 'credit',
                    amount: (item.price * item.quantity)-discountedPrice,
                    description: `Cancelled item from order ${item.itemOrderId}`
                });
                await wallet.save();
                item.itemPaymentStatus = "Refunded";
                item.itemStatus = "Cancelled";
            } else {
                console.log("Wallet not found for user");
            }
        }

        // Check if all items in the order are cancelled
        if (order.orderedItems.every(item => item.itemStatus === 'Cancelled')) {
            order.orderStatus = 'Cancelled';
        }
        if (order.orderedItems.every(item => item.itemPaymentStatus === 'Refunded')) {
            order.paymentStatus = 'Refunded';
        }
        
        await order.save();

        return res.status(200).json({ success: true, message: 'Item cancelled successfully' });

    } catch (error) {
        console.error('Error cancelling order item:', error);
        next(error)
    }
};




const returnOrder = async (req, res,next) => {
    try {
        const itemId = req.params.id;
        const reason = req.body.reason;
        console.log(reason)
        const order = await Order.findOne({ "orderedItems._id": itemId });
        
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
        const item = order.orderedItems.find(item => item._id.toString() === itemId);
        if ((item.itemStatus||order.orderStatus) === "Delivered") {
            let itemUpdated = false; // Track if the item was found and updated

            order.orderedItems.forEach(item => {
                // Check if the current item's ID matches the itemId from req.params
                if (item._id.toString() === itemId) { 
                    item.itemStatus = "Return Request";
                    item.reason = reason
                    itemUpdated = true;
                }
            });

            if (!itemUpdated) {
                return res.status(404).json({ success: false, message: 'Item not found in the order' });
            }

            if (order.orderedItems.every(item => item.itemStatus === 'Return Request')) {
                order.orderStatus = 'Return Request';
            }

            await order.save();
        } else {
            return res.status(400).json({ success: false, message: 'Order not eligible for return' });
        }

        return res.status(200).json({ success: true, message: 'Order return request successful' });
    
    } catch (error) {
        console.error('Error returning order:', error);
      next(error)
    }
}


const getWallet = async (req, res,next) => {
    try {
        const UserId = req.session.user._id; 
       
        let wallet = await Wallet.findOne( {userId:UserId}); 

        

        if (!wallet) {
            wallet = new Wallet({userId:UserId, walletBalance: 0, transactions: [] });
            await wallet.save(); 
        } else {
            // Sort the transactions by date (earliest to latest)
            wallet.transactions.sort((a, b) => new Date(a.date) - new Date(b.date));
        }
    

        
        res.render('wallet', {
            firstName: req.firstName,
            wallet,
            user:req.session.user
        });
    } catch (error) {
        console.error(error.message);
       next(error)
    }
};



const retryPayment = async (req, res, next) => {
    try {
        const id = req.params.id;
        const order = await Order.findById(id);
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        // Razorpay Payment (Card Payment)
        const finalAmountPaise = order.finalAmount * 100; // Convert to paise

        // Create Razorpay order
        const razorpayOrder = await instance.orders.create({
            amount: finalAmountPaise,
            currency: 'INR',
            receipt: `order_rcptid_${order._id}`,
        });

        if (!razorpayOrder) {
            // Handle error in creating Razorpay order
            order.orderStatus = 'Failed';
            order.paymentStatus = 'Failed';
            await order.save();

            return res.status(500).json({ message: 'Error creating Razorpay order' });
        }

        // Update the Razorpay order ID in the database
        order.razorpayOrderId = razorpayOrder.id;
        await order.save();

        // Send Razorpay order details to the frontend
        return res.json({
            orderId: razorpayOrder.id,
            amount: razorpayOrder.amount,
            currency: razorpayOrder.currency,
            key: process.env.Razorpay_Id, // Razorpay key for frontend
            name: 'Sneakerhead',
            description: 'Payment for your order',
            prefill: {
                name: req.session.user.name,
                email: req.session.user.email,
                contact: order.address.phone, // Assuming phone number is part of shippingAddress
            }
        });

    } catch (error) {
        // Handle unexpected errors
        console.error(error);
      next(error)
    }
};

module.exports = {
    getOrders,
    placeOrder,
    verifyPayment,
    orderConfirmationPage,
    userCancelOrder,
    getWallet,
    returnOrder,
    retryPayment
}