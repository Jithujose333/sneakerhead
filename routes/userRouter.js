const express = require('express')
const router = express.Router();
const passport = require('passport')
const userController = require('../controllers/user/userController');
const userProductController = require('../controllers/user/userProductController')
const userProfileController = require('../controllers/user/userProfileController')
const userOrderController = require('../controllers/user/userOrderController')
const userPasswordController = require('../controllers/user/userPasswordController')
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

router.get('/search',userProductController.searchResults)

router.get('/products/:id',userProductController.getProduct)
router.get('/wishlist',userAuth,userProductController.getWishlist)
router.post('/wishlist',userAuth,userProductController.addWishlist)
router.delete('/wishlist/deleteItems/:id',userAuth,userProductController.wishlistDeleteItems)


// user profile
router.get('/userProfile',userAuth,userProfileController.getProfile)
router.post('/userProfile',userAuth,userProfileController.editProfile)

// address management
router.get('/profile/address',userAuth,userProfileController.getAddress)
router.get('/profile/addAddress',userAuth,userProfileController.getaddAddress)
router.post('/profile/addAddress',userAuth,userProfileController.addAddress)
router.get('/profile/editAddress',userAuth,userProfileController.getEditAddress)
router.post('/profile/editAddress/:id',userAuth,userProfileController.editAddress)
router.delete('/profile/deleteAddress/:id',userAuth,userProfileController.deleteAddress)


// cart management
router.get('/cart',userAuth,userProductController.getCart)
// router.get('/cart/:id',userAuth,userProductController.getCart)
router.post('/cart',userAuth,userProductController.addToCart)
router.delete('/cart/deleteItems/:id',userAuth,userProductController.cartDeleteItems)
router.post('/update-quantity',userAuth,userProductController.cartUpdateQuantity)

router.get('/cart/checkout/:id',userAuth,userProductController.getCheckout)




// order management

router.post('/placeOrder',userAuth,userOrderController.placeOrder)
router.get('/profile/orders',userAuth,userOrderController.getOrders)
router.post('/profile/cancelOrder/:id',userAuth,userOrderController.userCancelOrder)
router.post('/profile/returnOrder/:id',userAuth,userOrderController.returnOrder)
router.post('/verify-payment', userAuth,userOrderController.verifyPayment);
router.get('/order-complete/:id',userAuth,userOrderController.orderConfirmationPage)


//coupon management

router.post('/coupon',userAuth,userProductController.addUserCoupon)
router.post('/coupon/remove/:id',userAuth,userProductController.removeUserCoupon)


router.get('/profile/wallet',userAuth,userOrderController.getWallet)



//forget password

router.get('/forgetpassword',userPasswordController.getforgetPassword)
router.post('/forgetpassword-email-valid',userPasswordController.forgetEmailValid)
router.get('/reset-password/:token', userPasswordController.getResetPassword);
router.post('/reset-password/:token', userPasswordController.postResetPassword);

module.exports = router;