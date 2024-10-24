const User = require('../../models/userSchema');
const env = require('dotenv').config();
const mongoose = require('mongoose')
const bcrypt = require('bcrypt');

const pageError = async (req,res) => {
    try {
        res.render('admin-error')
    } catch (error) {
        
    }
    
}
const loadLogin = async (req,res) => {

   
    if(req.session.admin ){
        res.render('dashboard', { admin: "admin" });
    }
    res.render("admin-login",{message:null})

}


const login = async (req,res) => {
    try {
        const {email,password}= req.body
    const admin = await User.findOne({email:email,isAdmin:true})
    if(admin){
        const passwordMatch =await bcrypt.compare(password,admin.password)
        if(passwordMatch){
            req.session.admin = true;
            return res.redirect('/admin/dashboard');
        }else{
            return res.redirect('/admin/login')
        }
    }else{
        return res.redirect('/admin/login')
    }
    } catch (error) {
        console.error("login error",error)
        return res.redirect('/pageerror')
        
    }
    
}
    




   const logout = async (req,res) => {
    try {
        req.session.destroy((err)=>{
            if(err){
                console.log('admin session destruction error',err.message)
            return res.redirect("/pageerror")
            }
            return  res.redirect('/admin/login')
        })
       
    } catch (error) {
        
        console.error(" admin Logout error",error)
        res.redirect("/pageerror")
    }
    
}

   





module.exports = {
    loadLogin,
    login,
    // loadDashboard,
    pageError,
    logout
}