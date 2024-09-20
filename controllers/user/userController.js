const User = require('../../models/userSchema')
const Product = require('../../models/productSchema')
const env = require('dotenv').config();
const nodemailer = require('nodemailer')
const bcrypt = require('bcrypt')

const pageNotFound = async (req,res) => {
    
    try {
        res.render("page-404")
    } catch (error) {
        res.redirect("/pageNotFound")
        
    }
}





 


const loadHomepage = async (req, res) => {
    try {
      const userId = req.session.user;  // User ID from session
      const guser = req.user;  // User object from Passport
  
      let userData;
      let products; // Add a variable to store products
  
      if (userId) {
        // Find user by session ID
        userData = await User.findOne({ _id: userId });
      } else if (guser) {
        // Find user by Passport user ID
        userData = await User.findOne({ _id: guser._id });
      }
  
      // Retrieve a list of products to display on the home page
      products = await Product.find({isBlocked:false}).limit(12); // Retrieve 12 products, for example
  
      if (userData) {
        // Extract first name from full name
        const firstName = userData.name.split(' ')[0];
        return res.render('home', { user: userData, firstName: firstName, products: products });
      } else {
        // Render homepage without user data if no user is found
        return res.render('home', { products: products });
      }
  
    } catch (error) {
      console.log("Home page not found:", error);
      res.status(500).send("Server error");
    }
  };

const loadSignup = async (req,res) => {
    try {
        res.render("signup")
    } catch (error) {
        console.log("failed to load signup");
        res.status(404).send("Server Error")
        
    }
}



function generateOtp(){
    return Math.floor(100000 + Math.random()*900000).toString();

}

async function sendVerificationEmail(email,otp) {
    try {
        const transporter = nodemailer.createTransport({
            service :'gmail',
            port :587,
            secure :false,
            requireTLS:true,
            auth:{
                user:process.env.NODEMAILER_EMAIL,
                pass:process.env.NODEMAILER_PASSWORD
            }
        })
        const info = await transporter.sendMail({
            from:process.env.NODEMAILER_EMAIL,
            to:email,
            subject:"Verify your account",
            text:`Your OTP is ${otp}`,
            html:`<b>Your OTP : ${otp}</b>`
        })


        return info.accepted.length >0
    } catch (error) {
        console.error("Error sending email",error);
        return false;
        
    }
    
}
const signup = async (req,res) => {

    try {

        const {name,email,phone,password,confirmpassword} = req.body

        const findUser = await User.findOne({email});
        if(findUser){
            return res.render("signup",{message:"User with this email already exists."})

        }
        const otp = generateOtp();

        const emailSent = await sendVerificationEmail(email,otp)
        if(!emailSent){
            return res.json("email.error")
        }

        req.session.userOtp = otp
        req.session.userData = {name,phone,email,password}

         res.render('verify-otp')
        console.log("OTP Sent ",otp)
    } catch (error) {
        console.error("signup error",error)
        res.redirect("/pageNotFound")
    }
    

}
 const securePassword = async (password) => {
    try {
        const passwordHash =  await bcrypt.hash(password,10)
        return passwordHash
    } catch (error) {
        console.error("Error hashing password:", error);
    }
    
 }

 const verifyOtp = async (req, res, next)=>{
    try{
        const {otp} = req.body;
        console.log(otp);
        

        if(otp ===req.session.userOtp){
            const user = req.session.userData;
            
            console.log(req.session.userData)
           
            const passwordHash = await securePassword(user.password);

         
           
            const saveUserData = new User({
                name:user.name,
                email:user.email,
                phone:user.phone,
                password:passwordHash,
               
            })
           

            await saveUserData.save();
            req.session.user = saveUserData._id;
           
            res.json({success:true, redirectUrl:"/"})
        }else {
            res.status(400).json({success:false, message:"Invalid OTP, Please try again"})
        }

    } catch (error){

        console.error("Error Verifying OTP",error);
        res.status(500).json({success:false, message:"An error occured"});

    }
}


const resendOtp = async (req,res) => {
    try {
        const {email} = req.session.userData;
        if(!email){
            return res.status(400).json({success:false,message:"Email not found in session"})
        }

        const otp = generateOtp();
        req.session.userOtp = otp;

        const emailSent = await sendVerificationEmail(email,otp);
        if(emailSent){
            console.log("Resend OTP:",otp);
            res.status(200).json({success:true,message:"OTP Resend Successfully"})
            
        }else{
            res.status(500).json({success:false,message:"Failed to resend OTP.Please try again"})
        }
    } catch (error) {
        console.error("Error resending OTP",error);
        res.status(500).json({success:false,message:"Internal Server Error.Please try again"})
    }
    
}


const loadLogin = async(req,res)=>{
   if(req.user){
    req.session.user = req.user
   }
    try {
        if(!req.session.user ){
            return res.render('login')
        }else{
            res.redirect('/')
        }
    } catch (error) {
        res.redirect('/pageNotFound')
        
    }
}



const login = async (req,res) => {
    try {
       const {email,password} = req.body
      

       const findUser = await User.findOne({isAdmin:0,email:email})
       if(!findUser){
         return res.render('login',{message:"User not found"})
        }
       if(findUser.isBlocked){
        return res.render('login',{message:"User is blocked by Admin "})
       }


       const passwordMatch = await bcrypt.compare(password,findUser.password)

       if(!passwordMatch){
       return res.render("login",{message:"Incorrect Password"})
       }

       req.session.user = findUser._id
       res.redirect('/')
    } catch (error) {
        console.error("login error",error)
        res.render('login',{message:"login failed. Please try again"})
    }
    
}

const logout = async (req,res) => {
    try {
        req.session.destroy((err)=>{
            if(err){
                console.log('session destruction error',err.message)
            return res.redirect("/pageNotFound")
            }
            return  res.redirect('/login')
        })
       
    } catch (error) {
        
        console.error("Logout error",error)
        res.redirect("/pageNotFound")
    }
    
}





module.exports = {
    loadHomepage,
    pageNotFound,
    loadSignup,
    signup,
    verifyOtp,
    resendOtp,
    loadLogin,
    login,
    logout
}





