const express = require('express')
const app = express();

const path = require('path')
const env = require('dotenv').config();
const session = require('express-session');
const passport = require('./config/passport')
const db = require('./config/db');
const methodOverride = require('method-override');
const userRouter = require ('./routes/userRouter');
const adminRouter = require('./routes/adminRouter')
const { errorHandler } = require('./middlewares/error')
db();


app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(session({
    secret : process.env.SESSION_SECRET,
    resave : false,
    saveUninitialized :true,
    cookie:{
        secure:false,
        httpOnly:true,
        maxAge:72*60*60*1000
    }
}))



app.use(passport.initialize());
app.use(passport.session())


app.use((req,res,next)=>{
    res.set('cache-control','no-store')
    next();
})

// setting view engine 
app.set("view engine","ejs")
app.set('views',[path.join(__dirname,"views/user"),path.join(__dirname,"views/admin")])
app.use(express.static(path.join(__dirname,'public')))

app.use(methodOverride('_method'));


app.use('/', userRouter);
app.use('/admin',adminRouter);

app.use(errorHandler)

app.listen(process.env.PORT ,()=>{
    console.log(`server connected on ${process.env.PORT} successfuly`);
    
})


module.exports = app;