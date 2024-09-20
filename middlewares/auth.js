const User = require('../models/userSchema')



const userAuth = (req,res,next) => {
    if(req.session.user || req.user){
        User.findById(req.session.user)
        User.findById(req.user)
        .then(data=>{
            if(data && !data.isBlocked){
                 next();
            }else{
                res.redirect('/login')
            }
        })
        .catch(error=>{
            console.log('Error in user auth middlware')
            res.status(500).send('Internal Server error')
        })
    }else{
        res.redirect('/login')
    }
    
}




const adminAuth = (req,res,next)=>{
   
   
    User.findOne({isAdmin:true})
    
   
    .then(data=>{
        if(data){
            next();
        }else{
            res.redirect('/admin/login')
        }
    })
    .catch(error=>{
        console.log("Error in admin auth middleware ",error)
        res.status(500).send('Internal server Error')
    })

}





module.exports ={
    userAuth,
    adminAuth
}