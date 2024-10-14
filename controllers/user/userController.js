const User = require('../../models/userSchema')
const Product = require('../../models/productSchema')
const Category = require('../../models/categorySchema')
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


// const loadHomepage = async (req, res) => {
//     try {
//       const userId = req.session.user;  
//       const selectedCategory = req.query.category;
//       let query = { isBlocked: false };
//       if (selectedCategory) {
//         const category = await Category.findOne({ name: selectedCategory });
//         if (category) {
//             query.category = category._id; // Use ObjectId if category is found
//         } 
//     }
  
         
//       const sortOption = req.query.sort || 'popularity'; 
  
//       let userData = null;
//       let products = []; 
  

    
//             userData = await User.findOne({ _id: userId });
                
    
//       let sortCriteria;
//       switch (sortOption) {
//         case 'priceLowHigh':
//           sortCriteria = { salePrice: 1 }; // Ascending price
//           break;
//         case 'priceHighLow':
//           sortCriteria = { salePrice: -1 }; // Descending price
//           break;
//         case 'averageRatings':
//           sortCriteria = { averageRating: -1 }; // Descending rating
//           break;
//         case 'az':
//           sortCriteria = { productName: 1 }; // A-Z sorting
//           break;
//         case 'za':
//           sortCriteria = { productName: -1 }; // Z-A sorting
//           break;
//         default:
//           sortCriteria = { popularity: -1 }; // Default: Popularity
//       }
  
//       // Retrieve a list of products with sorting
//     //   products = await Product.find({ isBlocked: false },{}).sort(sortCriteria).limit(12);
  
//     products = await Product.find(query).sort(sortCriteria).limit(12);

//     const categories= await Category.find();
    
//       if (userData) {
//         const firstName = userData.name ? userData.name.split(' ')[0] : 'User';
//         return res.render('home', { user: userData, firstName, products, sortOption,categories });
//       } else {
        
//         return res.render('home', { products, sortOption,categories});
//       }
  
//     } catch (error) {
//       console.error("Error loading home page:", error);
//       return res.status(500).render('error', { message: "Something went wrong on the server!" });
//     }
//   };
  



const loadHomepage = async (req, res) => {
    try {
        const userId = req.session.user;  
        const selectedCategory = req.query.category;
        let query = { isBlocked: false };

        // Adjust the query based on the selected category
        if (selectedCategory && selectedCategory !== 'all') {
            const category = await Category.findOne({ name: selectedCategory });
            if (category) {
                query.category = category._id; // Use ObjectId if category is found
            }
        }

        const sortOption = req.query.sort || 'popularity'; 

        let userData = null;
        let products = []; 
        
        userData = await User.findOne({ _id: userId });
        
        let sortCriteria;
        switch (sortOption) {
            case 'priceLowHigh':
                sortCriteria = { salePrice: 1 }; // Ascending price
                break;
            case 'priceHighLow':
                sortCriteria = { salePrice: -1 }; // Descending price
                break;
            case 'averageRatings':
                sortCriteria = { averageRating: -1 }; // Descending rating
                break;
            case 'az':
                sortCriteria = { productName: 1 }; // A-Z sorting
                break;
            case 'za':
                sortCriteria = { productName: -1 }; // Z-A sorting
                break;
            default:
                sortCriteria = { popularity: -1 }; // Default: Popularity
        }

        // Retrieve a list of products with sorting
        products = await Product.find(query).sort(sortCriteria).limit(12);

        // Fetch all categories
        const categories = await Category.find(); // Fetch all categories
        
        if (userData) {
            const firstName = userData.name ? userData.name.split(' ')[0] : 'User';
            return res.render('home', { user: userData, firstName, products, sortOption, categories });
        } else {
            return res.render('home', { products, sortOption, categories });
        }
    } catch (error) {
        console.error("Error loading home page:", error);
        return res.status(500).render('error', { message: "Something went wrong on the server!" });
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





