const Product = require('../../models/productSchema')
const Category = require('../../models/categorySchema')
const User = require('../../models/userSchema')




// const getProduct = async (req,res) => {
//     try {
//         const userId = req.session.user
//         const {id} = req.params
//         const product = await Product.findOne({_id:id})
//         const userData = await User.findOne({_id:userId})
        
//             const firstName = userData.name.split(' ')[0];
        
        
//         if(!product){
//             res.status(404).send('page-404')
//         }

//         res.render('user-products',{product:product,firstName:firstName})
//     } catch (error) {
//         res.status(500).send('/pageerror')
//     }
    
// }


const getProduct = async (req, res) => {
    try {
        const userId = req.session.user;
        const { id } = req.params;
        
        // Find the product by its ID
        const product = await Product.findOne({ _id: id });
        if (!product) {
            return res.status(404).render('page-404');  // Render a 404 page if product is not found
        }

        // Find the user data
        const userData = await User.findOne({ _id: userId });  // Use findOne to get a single user
        let firstName = '';  // Declare firstName in the outer scope

        if (userData) {
            firstName = userData.name.split(' ')[0];  // Extract first name
        }

        // Render the product page with product and user's first name
        res.render('user-products', { product: product, firstName: firstName });
    } catch (error) {
        console.error(error);  // Log the error for debugging
        res.status(500).render('page-error');  // Render an error page on failure
    }
};




module.exports = {
    getProduct
}