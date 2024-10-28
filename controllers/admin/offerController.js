const Coupon = require('../../models/couponSchema')
const Offer = require('../../models/offerSchema')
const Category = require('../../models/categorySchema')
const Product = require('../../models/productSchema')

const getCoupon = async (req, res, next) => {
    try {
        const search = req.query.search || ""; // Get the search query from the request
        const page = parseInt(req.query.page) || 1; // Current page number
        const limit = 4; // Number of coupons per page

        // Define the search query object
        const query = {
            $or: [
                { couponName: { $regex: search, $options: 'i' } },  // Search by couponName (case-insensitive)
                { couponCode: { $regex: search, $options: 'i' } }   // Search by couponCode (case-insensitive)
            ]
        };

        // Fetch the total count of coupons for pagination
        const count = await Coupon.countDocuments(query);

        // Fetch coupons with pagination and search filtering
        const coupons = await Coupon.find(query)
            .skip((page - 1) * limit) // Skip records for pagination
            .limit(limit); // Limit the number of records per page

        const noResults = count === 0; // Check if there are no results

        res.render('coupon', {
            coupons, 
            currentPage: page, 
            totalPages: Math.ceil(count / limit), 
            search, 
            noResults
        }); // Pass the coupons, pagination data, and search term to the view
    } catch (error) {
        console.error('Error fetching coupons:', error);
        next(error)
    }
};

    

const getCreateCoupon = async (req,res,next) => {
    try {
       
            return res.render('create-coupon');
        } catch (error) {
            console.error(err.message)
        next(error)
    }
}


const createCoupon = async (req, res, next) => {
    try {
        console.log(req.body);
        const { couponName, couponCode, startDate, endDate, minimumPrice, discount } = req.body;

        

        const newCoupon = new Coupon({
            couponName,
            couponCode,
            startDate,
            endDate,
            minimumPrice,
            discount,
        });

        await newCoupon.save();
        return res.status(201).json({ message: 'Coupon created successfully!' }); 

    } catch (error) {
        console.error('Error creating coupon:', error);
        next(error)
    }
};

const updateCoupon =  async (req, res,next) => {

    const { id } = req.params;
    const { isList } = req.body;
   
    try {
        const updatedCoupon = await Coupon.findByIdAndUpdate(
            id,
            { isList }, // Update the isList field
            { new: true } // Return the updated document
        );

        if (!updatedCoupon) {
            return res.status(404).json({ message: 'Coupon not found' });
        }

        res.json({ message: `Coupon has been ${isList ? 'Listed' : 'UnListed'}.` });
    } catch (error) {
        console.error('Error updating coupon:', error);
       next(error)
    }
};




const getAllOffers = async (req, res,next) => {
    try {
        const search = req.query.search || ""; // Get the search query from the request
        const page = parseInt(req.query.page) || 1; // Current page number
        const limit = 4; // Number of offers per page

        // Construct the search query
        const searchQuery = {
            offerName: { $regex: search, $options: "i" } // Case-insensitive search on coupon name
        };

       




        // Get total number of offers that match the search query
        const count = await Offer.countDocuments(searchQuery);

        // Fetch offers with pagination and search applied
        const offers = await Offer.find(searchQuery)
            .skip((page - 1) * limit) // Skip documents for pagination
            .limit(limit); // Limit the number of documents returned


            const currentDate = new Date();
            for (let offer of offers) {
                if (offer.endDate < currentDate && offer.isActive) {
                    offer.isActive = false;
                    await offer.save(); // Update the offer status in the database
                }
            }

        const noResults = offers.length === 0; // Check if there are no offers

        // Render the offers page with pagination data
        res.render('offers', {
            offers,
            currentPage: page,
            totalPages: Math.ceil(count / limit),
            search, // Pass the search query back to the view
            noResults // Boolean to indicate no results found
        });
    } catch (error) {
        console.error('Error fetching offers:', error);
       next(error)
    }
};


const getCreateOffer = async (req,res,next) => {
    try {
        // Fetch all categories from the database
        const categories = await Category.find({});
        res.render('create-offer', { categories });
    } catch (error) {
        console.error('Error fetching categories:', error);
        next(error)
    }
    
}






const createOffer = async (req, res) => {
    try {
        const { offerName, offerCode, startDate, endDate, discount, applicableProducts, category } = req.body;
        let categoriesForOffer = [];
        let categoryName;

        // Fetching categories based on input
        if (category === "all") {
            categoriesForOffer = await Category.find().select('_id'); // Fetch all category IDs
            categoryName = "All Categories"; // Set name for all categories
        } else {
            const categoryDoc = await Category.findOne({ _id: category }); // Fetch a single category by ID
            if (!categoryDoc) {
                return res.status(404).json({ message: 'Category not found' });
            }
            categoriesForOffer.push(categoryDoc._id); // Use Object ID for the specific category
            categoryName = categoryDoc.name; // Set the category name
        }

        // Create a new offer
        const newOffer = new Offer({
            offerName,
            description:offerCode,
            categoryName, // Use the category name variable
            categories: categoriesForOffer, // Use Object IDs for categories
            startDate,
            endDate,
            discount,
            applicableProducts,
        });
        await newOffer.save();

        // Update product sale prices based on the discount
        if (category === "all") {
            // Update products in all categories
            await Product.updateMany(
                {},
                [{  $set: { offerPrice: {$subtract: 
                    [ "$salePrice", { $multiply: ["$salePrice", discount / 100] } ]}}
                }]
            );
        } else {
            // Update products in the specific category
            await Product.updateMany(
                { category: category }, // Match against the specific category ID
                [ { $set: { offerPrice: { $subtract:
                     [ "$salePrice",  { $multiply: ["$salePrice", discount / 100] } ] } }
                    }]
            );
        }

        res.status(201).json({ message: 'Offer created successfully', offer: newOffer });
    } catch (error) {
        console.error('Error creating offer:', error); // Log the error for debugging
        res.status(400).json({ message: 'Error creating offer', error });
    }
};






const deleteOffer = async (req, res) => {
    try {
        const { id } = req.params;
        
        
        const offer = await Offer.findById(id);
        
        
        if (!offer) {
            return res.status(404).json({ message: 'Offer not found' });
        }

       
        if (offer.categoryName === "All Categories") {
            const products = await Product.find(); 
            for (const product of products) {
                product.offerPrice = 0; 
                await product.save();
            }
        } else {
           const category = await Category.find({ name: offer.categoryName})
            const products = await Product.find({ category: category._id });
            for (const product of products) {
                product.offerPrice = 0; 
            }
        }

        
        await Offer.findByIdAndDelete(id);
        
        return res.status(200).json({ message: 'Offer deleted successfully' });
    } catch (error) {
        console.error('Error deleting offer:', error);
        return res.status(400).json({ message: 'Error deleting offer', error });
    }
};



const getEditCoupon = async (req, res, next) => {
    const couponId = req.params.id;
    try {
        const coupon = await Coupon.findById(couponId);
        if (!coupon) {
            const error = new Error('Coupon not found');
            error.statusCode = 404;
            throw error; // Throw the error to be caught by the middleware
        }
        res.render('edit-coupon', { coupon });
    } catch (error) {
        // res.redirect('/admin/pageerror')
        next(error)
    }
};


const EditCoupon = async (req, res, next) => {
    const { id } = req.params;
    const updatedFields = req.body;

    try {
        const coupon = await Coupon.findByIdAndUpdate(id, updatedFields, { new: true });
        if (coupon) {
            res.status(200).json({ message: 'Coupon updated successfully.' });
        } else {
            const error = new Error('Coupon not found');
            error.statusCode = 404;
            throw error; // Throw the error to be caught by the middleware
        }
    } catch (error) {
       next(error)
    }
};


module.exports ={
    getCoupon,
    getCreateCoupon,
    createCoupon,
    updateCoupon,
    getAllOffers,
    getCreateOffer,
    createOffer,
    deleteOffer,
    getEditCoupon,
    EditCoupon

}