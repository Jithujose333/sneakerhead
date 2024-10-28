const express = require('express')
const router = express.Router();
const adminController = require('../controllers/admin/adminController')

const customerController = require('../controllers/admin/customerController')
const categoryController = require('../controllers/admin/categoryController')
const productController = require('../controllers/admin/productController')
const orderController = require('../controllers/admin/orderController')
const offerController = require('../controllers/admin/offerController')
const salesController = require('../controllers/admin/salesController')
const dashboardController = require('../controllers/admin/dashboardController')
const {adminAuth} = require('../middlewares/auth')

const multer = require('multer')
const storage = require('../helpers/multer')
const uploads = multer({storage:storage})



router.get('/pageerror',adminController.pageError)
router.get('/login',adminController.loadLogin);
router.post('/login',adminController.login)
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


// order management
router.get('/orders',adminAuth,orderController.getOrders)
router.post('/cancelOrder/:id',adminAuth,orderController.cancelOrder)
router.post('/updateOrderStatus/:id', adminAuth, orderController.updateOrderStatus);

// coupon management
router.get('/coupons',adminAuth,offerController.getCoupon)
router.get('/coupons/createcoupon',adminAuth,offerController.getCreateCoupon)
router.post('/coupons/createcoupon',adminAuth,offerController.createCoupon)
router.post('/coupons/updateListingStatus/:id',adminAuth,offerController.updateCoupon)
router.get('/coupons/:id',adminAuth,offerController.getEditCoupon)
router.put('/coupons/updatecoupon/:id',adminAuth,offerController.EditCoupon)

// offer management
router.get('/offers/createOffer',adminAuth, offerController.getCreateOffer);
router.post('/offers/createOffer', adminAuth,offerController.createOffer);
router.get('/offers', adminAuth,offerController.getAllOffers);
router.delete('/offers/deleteOffer/:id', adminAuth,offerController.deleteOffer);

//salesmanagement

router.get('/salesreport',adminAuth,salesController.getSalesReport)
router.get('/salesreport/pdf',adminAuth,salesController.getPdf)
router.get('/salesreport/excel',adminAuth,salesController.getExcel)

//dashboard

router.get('/dashboard',adminAuth,dashboardController.getDashboard)



module.exports = router;