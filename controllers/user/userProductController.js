const Product = require('../../models/productSchema')
const Category = require('../../models/categorySchema')
const User = require('../../models/userSchema')
const Cart = require('../../models/cartSchema')
const Address = require('../../models/addressSchema')
const Wishlist = require('../../models/wishlistSchema')
const Coupon = require('../../models/couponSchema')






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

        const Discount = cart.discount

        const delivery = 0;
        const discount = subtotal*Discount/100 || 0
        const total = subtotal - discount; 

    // const couponName = req.params.id

       
        res.render('cart', { 
            cartItems: cart.items,
            firstName: req.firstName,
            total,
            subtotal,
            discount,
            delivery,
            cartId ,
            products,
            cart,
           
        });
    } catch (error) {
        console.error('Error fetching cart:', error);
        res.status(500).send('Internal Server Error');
    }
};








const addToCart = async (req, res) => {
    try {
        const { productId, quantity } = req.body;
        
        
        const userId = req.session.user; 

       
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

       
        if (product.quantity < quantity) {
            return res.status(400).json({ message: `Only ${product.quantity} units available in stock` });
        }

        const productPrice = product.offerPrice || product.salePrice; 

        
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

let subtotal = cartData.items.reduce((sum, item) => sum + item.totalPrice, 0) 
let discount = subtotal*cartData.discount/100
let total = subtotal - discount


        res.render('checkout', { addresses: userAddresses, firstName: req.firstName ,cartData,cartId,addressId,
            subtotal,
            discount,
            total
        });
    } catch (error) {
        console.error("Error during checkout page load:", error);
        res.status(500).redirect('/pageNotFound');
    }
};



const getWishlist = async (req, res) => {
    try {
      const Id = req.session.user; 
      
      
      if (!Id) {
        return res.status(400).send('User ID not found in session.');
      }
  
      let wishlist = await Wishlist.findOne({ userId: Id._id}).populate('products.productId');
  
      if (!wishlist) {
        wishlist = new Wishlist({ userId: Id._id, products: [] });
        await wishlist.save();
        console.log('New wishlist created for user:', Id._id);
      }
  
      res.render('wishlist', { firstName: req.firstName, wishlist });
    } catch (error) {
      console.error('Error fetching wishlist:', error.message);
      res.status(500).redirect('PageNotFound');
    }
  };
  
   const addWishlist = async (req, res) => {
    try {
        const userId = req.session.user; // assuming user ID is stored in session
        const productId = req.body.productId; // product ID sent from the frontend

        // Check if the product exists
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Find user's wishlist
        let wishlist = await Wishlist.findOne({ userId: userId._id});

        if (!wishlist) {
            // If no wishlist exists, create a new one
            wishlist = new Wishlist({ userId, products: [] });
        }

        // Check if the product is already in the wishlist
        const productExists = wishlist.products.find(item => item.productId.toString() === productId);
        if (productExists) {
            return res.status(400).json({ message: 'Product already in wishlist' });
        }

        // Add product to the wishlist
        wishlist.products.push({ productId });
        await wishlist.save();

        return res.status(200).json({ message: 'Product added to wishlist successfully' });
    } catch (error) {
        console.error('Error adding product to wishlist:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};


const wishlistDeleteItems = async (req, res) => {
    try {
        const UserId = req.session.user._id;
        const wishlistId = req.params.id; // Get the ID from the route parameters

     
        const wishlist = await Wishlist.findOneAndUpdate(
            { userId: req.session.user._id}, // Assuming you have the user ID from the request
            { $pull: { products: { _id: wishlistId } } }, // Use $pull to remove the specific item
            { new: true } // Return the updated cart
        );

        if (!wishlist) {
            return res.status(404).json({ success: false, error: 'Item not found' });
        }

        return res.status(200).json({ success: true, message: 'Item removed successfully' });
    } catch (error) {
        console.error('Error deleting cart item:', error);
        return res.status(500).json({ success: false, error: 'An error occurred while removing the item' });
    }
}


const addUserCoupon = async (req, res) => {
    try {
        const { code: couponCode } = req.body; 
        const userId = req.session.user._id;

        // Find the coupon by code
        const couponData = await Coupon.findOne({ couponCode });
        if(couponData.isList===false){
            return res.status(404).json({ message: "Coupon code is not in use" });
        }
        if (!couponData) {
            return res.status(404).json({ message: "Invalid coupon code" });
        }
        const currentDate = new Date();
        if (couponData.endDate < currentDate && couponData.isList) {
            couponData.isList = false; 
            await couponData.save(); 
            return res.status(400).json({ message: "Coupon Expired" });
        }


        // Ensure the coupon hasn't already been used by the user
        if (couponData.userId.includes(userId)) {
            return res.status(400).json({ message: "Coupon already used by this user" });
        }

        
        couponData.userId.push(userId);
        await couponData.save();

        
        const userCart = await Cart.findOne({ userId }).populate('items.productId'); // Assuming Cart model stores product IDs
        const totalPrice = userCart.items.reduce((total, item) => {
            return total + item.quantity * item.price; // Adjust according to your schema
        }, 0);
       
        if (totalPrice < couponData.minimumPrice) {
            return res.status(400).json({ message: "Price is less than Minimum Price" });
        }
        if (!userCart) {
            return res.status(400).json({ message: "No cart found for this user" });
        }
              let discountAmount = couponData.discount
              userCart.discount = discountAmount
              userCart.appliedCoupon = true
              userCart.couponName =couponData.couponName     //new method
              await userCart.save()

            return  res.json({ message: "Coupon applied successfully", discount: couponData.discount });
       
       
       
    } catch (error) {
        console.error('Error applying coupon:', error);
        res.status(500).json({ message: "Error applying coupon", error });
    }
};


const removeUserCoupon = async (req, res) => {
    try {
        const userId = req.session.user._id;
        const couponName = req.params.id

       
        const userCart = await Cart.findOne({ userId }).populate('items.productId');

        if (!userCart) {
            return res.status(400).json({ message: "No cart found for this user" });
        }

        // Remove coupon from cart
        userCart.discount = 0;
        userCart.appliedCoupon = false;
        userCart.couponName = null
        await userCart.save();


        const couponData = await Coupon.findOne({couponName})
        couponData.userId.pull(userId)
        await couponData.save()


        // return res.status(200).json({ message: "The coupon has been removed successfully" });

        // Redirect back to the cart page
        res.redirect('/cart');
    } catch (error) {
        console.error('Error removing coupon:', error);
        res.status(500).json({ message: "Error removing coupon", error });
    }
};

const searchResults =async (req, res) => {
    const query = req.query.q; // Get search term from query parameter
    try {
        // Search for products where the product name matches the query (case-insensitive)
        const products = await Product.find({
            productName: { $regex: query, $options: 'i' } // 'i' for case-insensitive
        });

        // Render the search results page and pass the products to it
        res.render('search-results', { products, query ,firstName:req.firstName});
    } catch (error) {
        console.error("Error searching products:", error);
        res.status(500).redirect("/pageNotFound");
    }
};

const cartUpdateQuantity = async (req, res) => {
   

    try {
        const { productId, quantity } = req.body;
        // Fetch the product to check available stock
        const product = await Product.findById(productId);
        console.log(product)

        if (!product) {
            return res.json({ success: false, message: 'Product not found' });
        }

        // Check if the requested quantity is within available stock
        if (quantity > product.quantity) {
            return res.json({ success: false, message: 'Requested quantity exceeds available stock' });
        }

        // Update the quantity in the database
        await Product.updateOne(
            { _id: productId },
            { $set: { quantity: quantity } }
        );

        res.json({ success: true, message: 'Quantity updated successfully' });
    } catch (error) {
        console.error('Error updating quantity:', error);
        res.json({ success: false, message: 'Failed to update quantity' });
    }
};

module.exports = {
    getProduct,
    getCart,
    addToCart,
    cartDeleteItems,
    getCheckout,
    getWishlist,
    addWishlist,
    wishlistDeleteItems,
    addUserCoupon,
    removeUserCoupon,
    searchResults,
    cartUpdateQuantity
    
   
   
}