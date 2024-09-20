const express = require('express')
const router = express.Router();
const passport = require('passport')
const userController = require('../controllers/user/userController');
const userProductController = require('../controllers/user/userProductController')
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



module.exports = router;