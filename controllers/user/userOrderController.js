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



const placeOrder = async (req, res) => {
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
        if (!['COD', 'Card Payment'].includes(paymentMethod)) {
            return res.status(400).json({ message: 'Invalid payment method selected' });
        }

        // Fetch the cart details
        const cart = await Cart.findOne({ userId }).populate('items.productId');
        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ message: 'Cart is empty' });
        }

        const orderedItems = cart.items.map(item => ({
            product: item.productId._id,
            quantity: item.quantity,
            price: item.price
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
            couponApplied: couponApplied || false
        });

        await newOrder.save();

        // Razorpay Payment (Card Payment)
        if (paymentMethod === 'Card Payment') {
            const finalAmountPaise = finalAmount * 100; // Convert to paise

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
                if (!product) {
                    return res.status(404).json({ message: `Product with ID ${item.productId} not found.` });
                }
    
               
                if (item.quantity > product.quantity) {
                    return res.status(400).json({ message: `Not enough stock for ${product.name}. Available: ${product.quantity}` });
                }
    
               
                product.quantity -= item.quantity;
                if(item.quantity===0){
                    product.status ='out of stock'
                    }
                await product.save(); 
            }
            await Cart.deleteOne({ userId });
            const orderId = newOrder.orderId;
            res.json({
                success: true,
                message: 'Order placed successfully!',
                redirectUrl: `/order-complete/${orderId}`
            });
        }
    } catch (error) {
        console.error('Error placing order:', error);
        res.status(500).json({ message: 'Error placing order' });
    }
};




const verifyPayment = async (req, res) => {
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
            await order.save();

          const cart=  await Cart.findOne({ userId: order.userId });
          

          for (const item of cart.items) {
            const product = await Product.findById(item.productId);
            if (!product) {
                return res.status(404).json({ message: `Product with ID ${item.productId} not found.` });
            }

           
            if (item.quantity > product.quantity) {
                return res.status(400).json({ message: `Not enough stock for ${product.name}. Available: ${product.quantity}` });
            }

           
            product.quantity -= item.quantity;
            if(product.quantity===0){
            product.status ='out of stock'
            }
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
        res.status(500).json({ success: false, message: 'Error verifying payment' });
    }
};





const orderConfirmationPage = async (req, res) => {
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
      res.status(500).redirect('/pageNotFound') 
    }
  };
  
const getOrders = async (req, res) => {
    try {
        const userId = req.session.user;
        const orders = await Order.find({ userId }).populate('orderedItems.product'); // Ensure products are populated
        
        res.render('user-orders', {
            firstName: req.firstName,
            orders: orders
        });
    } catch (error) {
        console.error("Error fetching orders:", error);
        res.redirect('/pageNotFound');
    }
}



const userCancelOrder = async (req, res) => {
    try {
        const orderId = req.params.id;
        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
if(order.orderStatus === 'Return Request' ){
    order.orderStatus = 'Delivered';
    await order.save();
    return res.status(200).json({ success:true, message: 'Return request cancelled successfully' });
}
        

        if (order.orderStatus !== 'Shipped' && order.orderStatus !== 'Delivered' && order.orderStatus !== 'Return Request') {
            order.orderStatus = 'Cancelled';
            await order.save();

        if (order.paymentMethod === "Card Payment"|| order.orderStatus==="Return Approved") {
    

        const wallet = await Wallet.findOne({ userId: req.session.user._id });  

        if (wallet) {
       
        wallet.walletBalance += order.finalAmount;

        wallet.transactions.push({
            type: 'credit',
            amount: order.finalAmount,
            description: `Cancelled order of ${order.orderId}`
        });

       
        await wallet.save();
        order.paymentStatus="Refunded"
        await order.save()
        console.log("Wallet updated with transaction");
    } else {
        console.log("Wallet not found for user");
    }
}



            return res.status(200).json({ success: true, message: 'Order cancelled successfully' });
        } else {
            return res.status(400).json({ success: false, message: 'Cannot cancel a shipped or delivered order' });
        }
        
    } catch (error) {
        console.error('Error cancelling order:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const returnOrder = async (req,res) => {
    try {
        const orderId = req.params.id;
        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        if (order.orderStatus === "Delivered") {
            order.orderStatus = 'Return Request';
            await order.save();
        }

        
        return res.status(200).json({ success: true, message: 'Order return request successful' });
    
    
    } catch (error) {
        console.error('Error Returning order:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
    
}

const getWallet = async (req, res) => {
    try {
        const UserId = req.session.user._id; 
        console.log(UserId)
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
            wallet
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).redirect('/pageNotFound'); 
    }
};
module.exports = {
    getOrders,
    placeOrder,
    verifyPayment,
    orderConfirmationPage,
    userCancelOrder,
    getWallet,
    returnOrder
}