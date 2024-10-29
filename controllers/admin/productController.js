const Product = require("../../models/productSchema")
const Category = require('../../models/categorySchema')
const User = require('../../models/userSchema')
const Offer = require('../../models/offerSchema')
const fs = require('fs')
const path = require('path')
const sharp = require('sharp')




const getAddProduct = async (req,res,next) => {
    try {
        const category = await Category.find({isListed:true})
        
        res.render('add-product',{cat:category }) 
    } catch (error) {
      next(error)
        
    }
    
}





const addProduct = async (req, res, next) => {
    try {
    

        const products = req.body;
        const productExists = await Product.findOne({
            productName: products.productName
        });

        if (!productExists) {
            const images = [];

            if (req.files && req.files.length > 0) {
                for (let i = 0; i < req.files.length; i++) {
                    const orginalImagePath = req.files[i].path;
                    const resizedImagePath = path.join('public', 'uploads', 'product-images', req.files[i].filename);

                    try {
                        await sharp(orginalImagePath).resize({ width: 440, height: 440 }).toFile(resizedImagePath);
                    } catch (err) {
                        console.error("Sharp Error:", err);
                    }

                    images.push(req.files[i].filename);
                }
            }

            const categoryId = await Category.findOne({ name: products.category });
            if (!categoryId) {
                return res.status(400).json({ message: "Invalid category name" });
            }



            // Handling sizes array from the form----new code
            const sizes = products.sizes.map(sizeObj => ({
                size: sizeObj.size,
                quantity: sizeObj.quantity
            }));


            const newProduct = new Product({
                productName: products.productName,
                brand:products.brand,
                description: products.description,
                category: categoryId._id,
                regularPrice: products.regularPrice,
                salePrice: products.salePrice,
                createdOn: new Date(),
                sizes,// add size quantity
                color: products.color,
                productImage: images,
                status: 'Available',
            });

                 await newProduct.save();
                 return res.redirect("/admin/addProducts");
                    } else {
                        return res.status(400).json('Product already exists, please try with another name');
                    }

       
    } catch (error) {
        console.error("Error saving product", error);
       next(error)
    }
};


const getAllProducts = async (req,res, next) => {
    try {
        const search = req.query.search || ""
        const page = parseInt(req.query.page) || 1
        const limit = 4

        const productData = await Product.find({
            $or:[
                {productName:{$regex:new RegExp(".*"+search+".*","i")}}
                
            ],
        }).limit(limit*1).skip((page-1)*limit).populate('category').exec()


        const count = await Product.find({
            $or:[
                {productName:{$regex:new RegExp( ".*"+search+".*","i")}}
                // {brand:{$regex:new RegExp(".*"+search+".*","i")}}
            ],
        }).countDocuments();

        const category = await Category.find({isListed:true})
        // const brand = await Brand.find({isBlocked:false})

if(category){
    res.render('products',{
       data:productData,
       currentPage:page,
       totalPages:Math.ceil(count/limit),
       cat:category,
       
        
    })
}else{
    res.render("page-404")
}

    } catch (error) {
       next(error)
    }
    
}




const blockProduct = async(req,res,next)=>{

    try {
        let id = req.query.id
        await Product.updateOne({_id:id},{$set:{isBlocked:true}})
        res.redirect('/admin/products')
    } catch (error) {
        next(error)
    }
}


const unblockProduct = async(req,res,next)=>{

    try {
        let id = req.query.id
        await Product.updateOne({_id:id},{$set:{isBlocked:false}})
        res.redirect('/admin/products')
    } catch (error) {
       next(error)
    }
}

const getEditProduct = async (req,res,next) => {
    try {
        const id = req.query.id
        const product = await Product.findOne({_id:id})
        const category = await Category.find()
        // const brand = await Brand.find({})

        res.render('edit-product',{
            product:product,
            cat:category

        })
    } catch (error) {
       next(error)
        
    }
    
}
const editProduct = async (req, res,next) => {
    try {
        const id = req.params.id;
        const product = await Product.findOne({ _id: id });
        const data = req.body;
        

        // Check for existing product with the same name
        const existingProduct = await Product.findOne({
            productName: data.productName,
            _id: { $ne: id }
        });
        if (existingProduct) {
            return res.status(400).json({ error: "Product with this name already exists. Please try with another name." });
        }

        const images = [];
        // Image processing logic...
        if (req.files && req.files.length > 0) {
            for (let i = 0; i < req.files.length; i++) {
                const originalImagePath = req.files[i].path;
                const resizedImagePath = path.join('public', 'uploads', 'product-images', req.files[i].filename);

                try {
                    await sharp(originalImagePath).resize({ width: 440, height: 440 }).toFile(resizedImagePath);
                } catch (err) {
                    console.error("Sharp Error:", err);
                }
                images.push(req.files[i].filename);
            }
        }

        // Extract existing sizes and new sizes
        const newSizes = [];
        const existingSizes = [];

        // Handling existing sizes from the form
        if (data.sizes && Array.isArray(data.sizes)) {
            data.sizes.forEach((sizeObj, index) => {
                if (sizeObj.size && sizeObj.quantity) {
                    existingSizes.push({
                        size: sizeObj.size,
                        quantity: Number(sizeObj.quantity)
                    });
                }
            });
        }

        // Handling newly added sizes from the form
        if (data.sizes.new && data.sizes.new.size && data.sizes.new.quantity) {
            const newSizesArray = data.sizes.new.size;
            const newQuantitiesArray = data.sizes.new.quantity;

            for (let i = 0; i < newSizesArray.length; i++) {
                newSizes.push({
                    size: newSizesArray[i],
                    quantity: Number(newQuantitiesArray[i])
                });
            }
        }

        // Function to update sizes and quantities
        const updateSizeQuantities = async (productId, existingSizes, newSizes) => {
            const product = await Product.findOne({ _id: productId });

            // Create a map of existing sizes for easy lookup
            const existingSizesMap = product.sizes.reduce((map, sizeObj) => {
                map[sizeObj.size] = sizeObj;
                return map;
            }, {});

            // Update existing sizes
            existingSizes.forEach(sizeObj => {
                if (existingSizesMap[sizeObj.size]) {
                    existingSizesMap[sizeObj.size].quantity = sizeObj.quantity;
                }
            });

            // Add new sizes
            newSizes.forEach(newSizeObj => {
                if (!existingSizesMap[newSizeObj.size]) {
                    product.sizes.push(newSizeObj);
                }
            });

            await product.save();
            return product;
        };

        // Update size quantities
        const sizeUpdatedProduct = await updateSizeQuantities(id, existingSizes, newSizes);

        // Update product fields
        const updateFields = {
            productName: data.productName,
            brand: data.brand,
            description: data.descriptionData,
            category: product.category,
            regularPrice: data.regularPrice,
            salePrice: data.salePrice,
            sizes: sizeUpdatedProduct.sizes, // Update sizes only
            color: data.color
        };

        // Add new images if any
        if (images.length > 0) {
            updateFields.$push = { productImage: { $each: images } };
        }

        const updatedProduct = await Product.findByIdAndUpdate(id, updateFields, { new: true });

        // Handle offers
        const offers = await Offer.find({
            categoryName: updatedProduct.category.categoryName || "All Categories",
            isActive: true
        });

        if (offers.length > 0) {
            const maxDiscount = Math.max(...offers.map(offer => offer.discount));
            updatedProduct.offerPrice = updatedProduct.salePrice * (1 - maxDiscount / 100);
            await updatedProduct.save();
        }

        // Redirect to products page
        res.redirect('/admin/products');
    } catch (error) {
        console.error(`Error in editProduct: ${error.message}`);
       next(error)
    }
};







const deleteSingleImage = async (req,res,next) => {
    try {
        const {imageNameToServer,productIdToServer}= req.body
        const product = await Product.findByIdAndUpdate(productIdToServer,{$pull:{productImage:imageNameToServer}})
        const imagePath = path.join("public","uploads","re-image",imageNameToServer)
        if(fs.existsSync(imagePath)){
            await fs.unlinkSync(imagePath)
            console.log(`Image ${imageNameToServer}deleted succesfully`)
        }else{
            console.log(`Image ${imageNameToServer} not found`)
        }
        res.send({status:true})
    } catch (error) {
        next(error)
    }
}






module.exports = {
    getAddProduct,
    addProduct,
    getAllProducts,
    blockProduct,
    unblockProduct,
    getEditProduct,
    editProduct,
    deleteSingleImage
}