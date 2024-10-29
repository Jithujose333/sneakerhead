const Product = require('../../models/productSchema')
const Category = require('../../models/categorySchema')
const User = require('../../models/userSchema')
const Cart = require('../../models/cartSchema')
const Address = require('../../models/addressSchema')
const Wishlist = require('../../models/wishlistSchema')
const Coupon = require('../../models/couponSchema')






const getProduct = async (req, res ,next) => {
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
        // res.status(500).render('page-404'); 
        next(error)
    }
};





const getCart = async (req, res, next) => {
    try {
        if (!req.session.user || !req.session.user._id) {
            return res.redirect('/login'); 
        }

        const userId = req.session.user._id; 
        
        
        const products = await Product.find()
        
        // Find the user's cart and populate product details
        let cart = await Cart.findOne({ userId }).populate('items.productId'); 

        if (!cart) {
            // Create a new cart if not found
            cart = new Cart({ userId, items: [] });
            await cart.save(); 
            console.log('New cart created for user:', userId);
        }

        // const cartId = cart._id; 

        let subtotal = 0;
        let outOfStockItems = false;
        

        // Check size and quantity availability for each item in the cart
        cart.items.forEach(item => {
            const product = item.productId;

            // Find the size entry in the product's available sizes and quantities
            const sizeEntry = product.sizes.find(sizeObj => sizeObj.size === item.size);

            if (sizeEntry && sizeEntry.quantity >= item.quantity) {
                
                subtotal += item.price * item.quantity;
            } else {
                
                outOfStockItems = true
            }
        });

        const Discount = cart.discount;
        const delivery = 0;
        const discount = subtotal * Discount / 100 || 0;
        const total = subtotal - discount;

        // Render the cart page
        res.render('cart', { 
            cartItems: cart.items,
            firstName: req.firstName,
            total,
            subtotal,
            discount,
            delivery,
            // cartId,
            products,
            cart,
            outOfStockItems,  
        });
    } catch (error) {
        console.error('Error fetching cart:', error);
        next(error)
    }
};



const addToCart = async (req, res,next) => {
    try {
        const { productId, quantity, selectedSize } = req.body;
        const userId = req.session.user;

       

        // Ensure selectedSize is a number
        const sizeToCheck = Number(selectedSize);

        // Find the product
        const product = await Product.findById(productId);
        if (!product) {
           
            return res.status(404).json({ message: 'Product not found' });
        }

        // Find the size object that matches the selectedSize
        const sizeObject = product.sizes.find(size => size.size === sizeToCheck);
       

        // Check if the selected size exists
        if (!sizeObject) {
           
            return res.status(400).json({ message: 'Selected size is not available' });
        }

        // Check available quantity for the selected size
        if (sizeObject.quantity < quantity) {
            
            return res.status(400).json({ error: `Only ${sizeObject.quantity} units available in stock for size ${sizeToCheck}` });
        }

        const productPrice = product.offerPrice || product.salePrice;

        // Find or create the cart for the user
        let cart = await Cart.findOne({ userId });
        if (!cart) {
            cart = new Cart({ userId, items: [] });
        }

        // Check if the product already exists in the cart
        const itemIndex = cart.items.findIndex(item => item.productId.toString() === productId && item.size === sizeToCheck);

        if (itemIndex > -1) {
            // Product already exists in cart, check if total quantity exceeds stock
            const newQuantity = cart.items[itemIndex].quantity + quantity;
            if (newQuantity > sizeObject.quantity) {
                
                return res.status(400).json({ error: `You cannot add more than ${sizeObject.quantity} units of this product in size ${sizeToCheck}` });
            }

            // Update the quantity and total price in the cart
            cart.items[itemIndex].quantity = newQuantity;
            cart.items[itemIndex].totalPrice = newQuantity * cart.items[itemIndex].price;
        } else {
            // For new products, check if the quantity is available
            const totalPrice = productPrice * quantity;

            cart.items.push({
                productId: product._id,
                size: sizeToCheck,
                quantity: quantity,
                price: productPrice,
                totalPrice: totalPrice,
            });
        }

        // Save the cart
        await cart.save();

        // Return success response
        res.json({ message: 'Product added to cart successfully' });
    } catch (error) {
        console.error('Error adding to cart:', error);
        next(error)
    }
};





const cartDeleteItems = async (req, res,next) => {
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
       next(error)
    }
}






const getCheckout = async (req, res,next) => {
    try {
        const cartId = req.params.id;
        
        const cartData = await Cart.findOne({ _id: cartId }).populate('items.productId')
       
      
        const userId = cartData.userId || req.session.user?._id; // Prefer cartData.userId, fallback to session
        
        if (!userId) {
            return res.status(400).send('User ID not found in the cart or session');
        }

        const userAddresses = await Address.find({ userId }).populate('userId');

       
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
      next(error)
    }
};



const getWishlist = async (req, res,next) => {
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
     next(error)
    }
  };
  
   const addWishlist = async (req, res,next) => {
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
       next(error)
    }
};


const wishlistDeleteItems = async (req, res,next) => {
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
        next(error)
    }
}


const addUserCoupon = async (req, res,next) => {
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
        next(error);
    }
};


const removeUserCoupon = async (req, res,next) => {
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
       next(error)
    }
};

const searchResults =async (req, res,next) => {
    const query = req.query.q; // Get search term from query parameter
    try {
        // Search for products where the product name matches the query (case-insensitive)
        const products = await Product.find({
            productName: { $regex: query, $options: 'i' } // 'i' for case-insensitive
        });
        if(req.session.user){
            const userId = req.session.user
            let userData = await User.findOne({ _id: userId });
        var firstName = userData.name ? userData.name.split(' ')[0] : 'User';
        }
        // Render the search results page and pass the products to it
        res.render('search-results', { products, query ,firstName});
    } catch (error) {
        console.error("Error searching products:", error);
        next(error)
    }
};





const cartUpdateQuantity = async (req, res,next) => {
    const { productId, selectedSize, newQuantity } = req.body; // Assuming these are sent in the request body
    const userId = req.session.user._id;

    try {
        // Validate selectedSize
        if (!selectedSize) {
            return res.status(400).json({ success: false, message: 'Requested size is required.' });
        }

        // Find the product by ID
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found.' });
        }

        // Parse selectedSize as a number
        const selectedSizeNumber = parseInt(selectedSize, 10);

        // Find the size object in the product's sizes array
        const sizeEntry = product.sizes.find(size => size.size === selectedSizeNumber);
        if (!sizeEntry) {
            return res.status(404).json({ success: false, message: 'Selected size not found in product.' });
        }

        // Check if the new quantity is valid
        if (newQuantity <= 0 || newQuantity > sizeEntry.quantity) {
            return res.status(400).json({ success: false, message: `Only ${sizeEntry.quantity} units available in stock for size ${selectedSizeNumber}.` });
        }

        // Find the user's cart
        const cart = await Cart.findOne({ userId });
        if (!cart) {
            return res.status(404).json({ success: false, message: 'Cart not found.' });
        }

        // Find the item in the cart that matches both productId and size
        const itemInCart = cart.items.find(item => item.productId.toString() === productId && item.size === selectedSizeNumber);

        if (!itemInCart) {
            return res.status(404).json({ success: false, message: 'Item not found in cart.' });
        }

        // Update the quantity and total price of the item in the cart
        itemInCart.quantity = newQuantity;
        itemInCart.totalPrice = itemInCart.price * newQuantity;

        // Save the updated cart
        await cart.save();

        return res.json({ success: true, message: 'Quantity updated successfully.', cart });
    } catch (error) {
        console.error('Error updating quantity:', error);
        next(error)
    }
};


const getStock = async (req, res, next) => {
    try {
        const productId = req.params.productId;
        const size = parseInt(req.params.size); // Convert size to an integer for comparison
        

        // Fetch the product's stock from the database
        const product = await Product.findById(productId);

        if (!product) {
            return res.json({ success: false, message: 'Product not found' });
        }

        // Find the stock for the specified size
        const sizeStock = product.sizes.find(sizeEntry => sizeEntry.size === size);

        if (!sizeStock) {
            return res.json({ success: false, message: 'Size not found for this product' });
        }

        const availableStock = sizeStock.quantity; // Get the available quantity for the specified size

        res.json({ success: true, stock: availableStock });
    } catch (error) {
        console.error('Error fetching product stock:', error);
      next(error)
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
    cartUpdateQuantity,
    getStock
    
   
   
}