const Category = require("../../models/categorySchema")


const categoryInfo = async (req,res,next) => {
   
    try {
         
        const page = parseInt(req.query.page) || 1;
        const limit = 4
        const skip =(page-1)*limit

        const categoryData = await Category.find({}).sort({createdAt:-1}).skip(skip).limit(limit)
       
       const totalCategories = await Category.countDocuments();
        const totalPages = Math.ceil(totalCategories/limit);
        res.render('category',{
            cat:categoryData,
            currentPage: page,
            totalPages: totalPages,
            totalCategories :totalCategories
        })
    } catch (error) {
        next(error)
    }
    
}


const addCategory = async (req,res,next) => {
    const {name,description} = req.body
    try {
        
        const existingCategory = await Category.findOne({name});
        if(existingCategory){
            return res.status(400).json({error:"Category already exists"})
        }
        const newCategory = new Category({
          name,
          description
        })
        await newCategory.save();
      return res.json({message:"Category added succesfully"})
    } catch (error) {
        next(error)
        
    }
    
}


const getListCategory =async (req,res,next) => {
    try {
        let id = req.query.id
        await Category.updateOne({_id:id},{$set:{isListed:false}})
        res.redirect('/admin/category')
    } catch (error) {
       next(error)
    }
    
}


const getUnListCategory = async (req,res,next) => {
    try {
        let id = req.query.id
        await Category.updateOne({_id:id},{$set:{isListed:true}})
        res.redirect('/admin/category')
    } catch (error) {
        next(error)
    }
    
}

const getEditCategory = async (req,res,next) => {
    try {
        const id = req.query.id
        const category =await Category.findOne({_id:id})
        res.render('edit-category',{category:category}) 
    } catch (error) {
       next(error)
    }
}


const editCategory = async (req,res,next) => {
    try {
        const id = req.params.id;
        const {categoryName,description} = req.body;
        const existingCategory = await Category.findOne({name:categoryName})

        if(existingCategory){
            return res.status(400).json({error:"Category exists, please choose ohter name"})
        }

        const updateCategory = await Category.findByIdAndUpdate(id,{
            name:categoryName,
            description:description,

        },{new:true})

        if(updateCategory){
            res.redirect('/admin/category')
        }else{
            res.status(404).json({error:'Category not found'})
        }
    } catch (error) {
      next(error)
        
    }
    
}









module.exports= {
    categoryInfo,
    addCategory,
    getListCategory,
    getUnListCategory,
    getEditCategory,
    editCategory
}