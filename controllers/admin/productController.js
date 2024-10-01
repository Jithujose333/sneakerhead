const Product = require("../../models/productSchema")
const Category = require('../../models/categorySchema')
const User = require('../../models/userSchema')
const fs = require('fs')
const path = require('path')
const sharp = require('sharp')




const getAddProduct = async (req,res) => {
    try {
        const category = await Category.find({isListed:true})
        
        res.render('add-product',{cat:category }) 
    } catch (error) {
        res.redirect('/pageerror')
        
    }
    
}





const addProduct = async (req, res) => {
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

            const newProduct = new Product({
                productName: products.productName,
                description: products.description,
                category: categoryId._id,
                regularPrice: products.regularPrice,
                salePrice: products.salePrice,
                createdOn: new Date(),
                quantity: products.quantity,
                size: products.size,
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
        return res.redirect("/admin/pageerror");
    }
};


const getAllProducts = async (req,res) => {
    try {
        const search = req.query.search || ""
        const page = parseInt(req.query.page) || 1
        const limit = 4

        const productData = await Product.find({
            $or:[
                {productName:{$regex:new RegExp(".*"+search+".*","i")}}
                // {brand:{$regex:new RegExp(".*"+search+".*","i")}}
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
        res.redirect('/pageerror')
    }
    
}




const blockProduct = async(req,res)=>{

    try {
        let id = req.query.id
        await Product.updateOne({_id:id},{$set:{isBlocked:true}})
        res.redirect('/admin/products')
    } catch (error) {
        res.redirect('/pageerror')
    }
}


const unblockProduct = async(req,res)=>{

    try {
        let id = req.query.id
        await Product.updateOne({_id:id},{$set:{isBlocked:false}})
        res.redirect('/admin/products')
    } catch (error) {
        res.redirect('/pageerror')
    }
}

const getEditProduct = async (req,res) => {
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
        res.redirect('/pageerror')
        
    }
    
}


const editProduct = async (req,res) => {
    try {
        const id = req.params.id
        const product = await Product.findOne({_id:id})
        const data = req.body
        const existingProduct = await Product.findOne({
            productName:data.productName,
            _id:{$ne:id}
        })
        if(existingProduct){
            return res.status(400).json({error:"product with this name already exists.Please try with another name"})
        }
        const images =[]
        if(req.files && req.files.length>0){
            for(let i=0;i<req.files.length;i++){
                
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

        const updateFields = {
            productName:data.productName,
            description:data.description,
            category:product.category,
            regularPrice:data.regularPrice,
            salePrice:data.salePrice,
            quantity:data.quantity,
            size:data.size,
            color:data.color
        }
        if(req.files.length>0){
            updateFields.$push ={productImage:{$each:images}}
        }
        await Product.findByIdAndUpdate(id,updateFields,{new:true})
        res.redirect('/admin/products')
    } catch (error) {
        console.error(`Error in editProduct: ${error.message}`);
        res.redirect('/pageerror')
    }
    
}





const deleteSingleImage = async (req,res) => {
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
        res.redirect('/pageerror')
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