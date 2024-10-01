const express = require('express')
const router = express.Router();
const passport = require('passport')
const userController = require('../controllers/user/userController');
const userProductController = require('../controllers/user/userProductController')
const userProfileController = require('../controllers/user/userProfileController')
const userOrderController = require('../controllers/user/userOrderController')
const {userAuth,adminAuth} = require('../middlewares/auth')


router.get("/pageNotFound",userController.pageNotFound)
router.get('/',userController.loadHomepage)
router.get('/signup',userController.loadSignup)
router.post('/signup',userController.signup)
router.post('/verify-otp',userController.verifyOtp)
router.post('/resend-otp',userController.resendOtp)


router.get('/auth/google',passport.authenticate('google',{scope:['profile','email']}))
router.get('/auth/google/callback',passport.authenticate('google',{failureRedirect:'/signup'}),userAuth,(req,res)=>{
    res.redirect('/')
})

router.get('/login',userController.loadLogin)
router.post('/login',userController.login)
router.get('/logout',userController.logout)


router.get('/products/:id',userProductController.getProduct)


router.get('/userProfile',userAuth,userProfileController.getProfile)
router.post('/userProfile',userAuth,userProfileController.editProfile)
router.get('/profile/address',userAuth,userProfileController.getAddress)
router.get('/profile/addAddress',userAuth,userProfileController.getaddAddress)
router.post('/profile/addAddress',userAuth,userProfileController.addAddress)
router.get('/profile/editAddress',userAuth,userProfileController.getEditAddress)
router.post('/profile/editAddress/:id',userAuth,userProfileController.editAddress)
router.delete('/profile/deleteAddress/:id',userAuth,userProfileController.deleteAddress)



router.get('/cart',userAuth,userProductController.getCart)
router.post('/cart',userAuth,userProductController.addToCart)
router.delete('/cart/deleteItems/:id',userAuth,userProductController.cartDeleteItems)

router.get('/cart/checkout/:id',userAuth,userProductController.getCheckout)
router.post('/placeOrder',userAuth,userProductController.placeOrder)
// router.post('/order/place',userAuth,userProductController.addOrder)


router.get('/profile/orders',userAuth,userOrderController.getOrders)

module.exports = router;