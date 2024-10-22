const mongoose = require("mongoose");
const {Schema} = mongoose;



const productSchema = new Schema({
    sku: {
        type: String,
        default: () => Math.floor(100000 + Math.random() * 900000).toString(),
        required: true, 
        unique: true 
      },
    productName : {
        type: String,
        required:true,
    },
    description: {
        type :String,
        required:true,
    },
    brand: {
        type:String,
        enum:["Adidas","Puma","Nike"],
        required:false,
    },
    category: {
        type:Schema.Types.ObjectId,
        ref:"Category",
        required:true,
    },
    regularPrice:{
        type:Number,
        required:true,
    },
    salePrice:{
        type:Number,
        required:true
    },
    offerPrice : {
        type:Number,
        default:0,
    },
    
    sizes: [
        {
            size: { type: Number, required: true },
            quantity: { type: Number, required: true },
        }
    ],
    color: {
        type:String,
        required:true
    },
    averageRating: 
           {
         type: Number, 
         default: 0 
    },
    productImage:{
        type:[String],
        required:true
    },
    isBlocked:{
        type:Boolean,
        default:false
    },
    status:{
        type:String,
        enum:["Available","out of stock","Discountinued"],
        required:true,
        default:"Available"
    },
},{timestamps:true});



const Product = mongoose.model("Product",productSchema);

module.exports = Product;