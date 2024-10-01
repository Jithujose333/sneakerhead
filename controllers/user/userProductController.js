const Product = require('../../models/productSchema')
const Category = require('../../models/categorySchema')
const User = require('../../models/userSchema')
const Cart = require('../../models/cartSchema')
const Address = require('../../models/addressSchema')
const Order = require('../../models/orderSchema')






const getProduct = async (req, res) => {
    try {
        const userId = req.session.user;
        const { id } = req.params;
        
        // Find the product by its ID
        const product = await Product.findOne({ _id: id });
        if (!product) {
            return res.status(404).render('page-404');  
        }
const products = await Product.find({category:product.category,_id: { $ne: product._id }  }).limit(4);
       
        const userData = await User.findOne({ _id: userId }); 
        let firstName = '';  

        if (userData) {
            firstName = userData.name.split(' ')[0];  
        }

        res.render('user-products', { product: product, firstName: firstName ,products});
    } catch (error) {
        console.error(error);  
        res.status(500).render('page-404');  
    }
};


const getCart = async (req, res) => {
    try {
        if (!req.session.user || !req.session.user._id) {
            return res.redirect('/login'); 
        }

        const userId = req.session.user._id; 
       
const products = await Product.find().limit(4)
        
        let cart = await Cart.findOne({ userId }).populate('items.productId'); 

        if (!cart) {
            
            cart = new Cart({ userId, items: [] });
            await cart.save(); 
            console.log('New cart created for user:', userId);
        }

        const cartId = cart._id; 

        let subtotal = 0;
        cart.items.forEach(item => {
            subtotal += item.price * item.quantity; 
        });

        const delivery = 0;
        const discount = 0; 
        const total = subtotal + delivery - discount; 

       
        res.render('cart', { 
            cartItems: cart.items,
            firstName: req.firstName,
            total,
            subtotal,
            discount,
            delivery,
            cartId ,
            products
        });
    } catch (error) {
        console.error('Error fetching cart:', error);
        res.status(500).send('Internal Server Error');
    }
};








const addToCart = async (req, res) => {
    try {
        const { productId, quantity } = req.body;
        console.log(productId);
        
        const userId = req.session.user; 

       
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

       
        if (product.quantity < quantity) {
            return res.status(400).json({ message: `Only ${product.quantity} units available in stock` });
        }

        const productPrice = product.salePrice || product.regularPrice; 

        
        let cart = await Cart.findOne({ userId });
        if (!cart) {
            cart = new Cart({ userId, items: [] });
        }

        // Check if the product already exists in the cart
        const itemIndex = cart.items.findIndex(item => item.productId.toString() === productId);

        if (itemIndex > -1) {
            // Product already exists in cart, check if total quantity exceeds stock
            const newQuantity = cart.items[itemIndex].quantity + quantity;
            if (newQuantity > product.quantity) {
                return res.status(400).json({ message: `You cannot add more than ${product.quantity} units of this product` });
            }

            // Update the quantity and total price in the cart
            cart.items[itemIndex].quantity = newQuantity;
            cart.items[itemIndex].totalPrice = newQuantity * cart.items[itemIndex].price;
        } else {
            // For new products, check if the quantity is available
            if (quantity > product.quantity) {
                return res.status(400).json({ message: `Only ${product.quantity} units available in stock` });
            }

            const totalPrice = productPrice * quantity;
           
            cart.items.push({
                productId: product._id,
                quantity: quantity,
                price: productPrice,
                totalPrice: totalPrice, 
            });
        }

        
        await cart.save();

        
        res.json({ message: 'Product added to cart successfully' });
    } catch (error) {
        console.error('Error adding to cart:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};


const cartDeleteItems = async (req, res) => {
    try {
        const userId = req.session.user._id;
        const cartItemId = req.params.id; // Get the ID from the route parameters

     
        const cartItem = await Cart.findOneAndUpdate(
            { userId: req.session.user._id }, // Assuming you have the user ID from the request
            { $pull: { items: { _id: cartItemId } } }, // Use $pull to remove the specific item
            { new: true } // Return the updated cart
        );

        if (!cartItem) {
            return res.status(404).json({ success: false, error: 'Item not found' });
        }

        return res.status(200).json({ success: true, message: 'Item removed successfully' });
    } catch (error) {
        console.error('Error deleting cart item:', error);
        return res.status(500).json({ success: false, error: 'An error occurred while removing the item' });
    }
}








const getCheckout = async (req, res) => {
    try {
        const cartId = req.params.id;
        
        const cartData = await Cart.findOne({ _id: cartId }).populate('items.productId')
       
      
        const userId = cartData.userId || req.session.user?._id; // Prefer cartData.userId, fallback to session
        
        if (!userId) {
            return res.status(400).send('User ID not found in the cart or session');
        }

        const userAddresses = await Address.find({ userId }).populate('userId');

        if (!userAddresses.length) {
            return res.render('checkout', { addresses: [], firstName: req.firstName, message: 'No addresses found' });
        }
const addressId = userAddresses._id
        res.render('checkout', { addresses: userAddresses, firstName: req.firstName ,cartData,addressId});
    } catch (error) {
        console.error("Error during checkout page load:", error);
        res.status(500).send('An error occurred while loading the checkout page');
    }
};



const placeOrder = async (req, res) => {
    try {
        const userId = req.session.user._id;

       
        if (!userId) {
            return res.status(401).json({ message: 'User not authenticated' });
        }

        const { addressId, paymentMethod } = req.body;

        // Validate the selected address
    const selectedAddress = await Address.findById(addressId);
    console.log(selectedAddress)
        if (!selectedAddress) {
            return res.status(400).json({ message: 'Invalid address selected' });
        }

        // Check the payment method
        if (!['COD', 'Card'].includes(paymentMethod)) {
            return res.status(400).json({ message: 'Invalid payment method selected' });
        }

        
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
            return totalPrice
        });

        const finalAmount = totalPrice;

        
        const newOrder = new Order({
            userId,  
            orderedItems, 
            totalPrice,
            finalAmount,
            address: selectedAddress._id, 
            paymentMethod, 
            status: 'Pending' 
        });

    
        await newOrder.save();

      
        await Cart.deleteOne({ userId });

        
        const firstName = req.firstName
        res.render("order-complete",{firstName,orderId: newOrder.orderId})
    } catch (error) {
        console.error('Error placing order:', error);
        res.status(500).json({ message: 'Error placing order' });
    }
};




module.exports = {
    getProduct,
    getCart,
    addToCart,
    cartDeleteItems,
    getCheckout,
    placeOrder,
   
}