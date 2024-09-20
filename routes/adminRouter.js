const express = require('express')
const router = express.Router();
const adminController = require('../controllers/admin/adminController')

const customerController = require('../controllers/admin/customerController')
const categoryController = require('../controllers/admin/categoryController')
const productController = require('../controllers/admin/productController')
const {userAuth,adminAuth} = require('../middlewares/auth')
const multer = require('multer')
const storage = require('../helpers/multer')
const uploads = multer({storage:storage})



router.get('/pageerror',adminController.pageError)
router.get('/login',adminController.loadLogin);
router.post('/login',adminController.login)
router.get('/dashboard',adminController.loadDashboard)
router.get('/logout',adminController.logout)
//user management
router.get('/users',adminAuth,customerController.customerInfo)
router.get('/blockCustomer',adminAuth,customerController.customerBlocked)
router.get('/unblockCustomer',adminAuth,customerController.customerunBlocked)
//category management
router.get('/category',adminAuth,categoryController.categoryInfo)
router.post('/addCategory',categoryController.addCategory)
router.get('/listCategory',adminAuth,categoryController.getListCategory)
router.get('/unListCategory',adminAuth,categoryController.getUnListCategory)
router.get('/editCategory',adminAuth,categoryController.getEditCategory)
router.post('/editCategory/:id',adminAuth,categoryController.editCategory)

//product management
router.get('/addProducts',adminAuth,productController.getAddProduct)
router.post('/addProducts',adminAuth,uploads.array("images",4),productController.addProduct)
router.get('/products',adminAuth,productController.getAllProducts)
router.get('/blockProduct',adminAuth,productController.blockProduct)
router.get('/unblockProduct',adminAuth,productController.unblockProduct)
router.get('/editProduct',adminAuth,productController.getEditProduct)
router.post('/editProduct/:id',adminAuth,uploads.array("images",4),productController.editProduct)
router.post('/deleteImage',adminAuth,productController.deleteSingleImage)



module.exports = router;