const User = require('../models/userSchema')




const userAuth = (req, res, next) => {
    
    const userId = req.session.user || req.user;

    if (userId) {
    
        User.findById(userId)
            .then(data => {
                if (data && data.isBlocked === false) {
                    
                     req.firstName = data.name.split(' ')[0];
                     req.session.user = data;
                    
                     next(); 
                } else {
                    res.redirect('/login'); 
                }
            })
            .catch(error => {
                console.log('Error in user auth middleware:', error);
                res.status(500).send('Internal Server Error');
            });
    } else {
      
        res.redirect('/login');
    }
};



const adminAuth = (req, res, next) => {
   try {
    
  
    if (req.session.admin && !req.user) {
      
        return next();
    } else {
       
        return res.redirect('/admin/login');
    }  } catch (error) {
        console.log("Error in admin auth middleware ",error)
                res.status(500).redirect('/pageerror')
    }
};



module.exports ={
    userAuth,
    adminAuth
}