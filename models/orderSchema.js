const mongoose = require("mongoose");
const {Schema} = mongoose;
const {v4:uuidv4} = require('uuid');



const orderSchema = new Schema({
    orderId : {
        type:String,
        default: () => uuidv4().replace(/-/g, '').substring(0, 12).toUpperCase(),
        // default: generateOrderId, 
        unique:true
    },
    userId: {
        type:Schema.Types.ObjectId,
        ref:"User",
        required : true
    },
    orderedItems:[{
        itemOrderId: {
            type: String,
            default: () => uuidv4().split('-')[0],
            unique: true
          },

        product:{
            type:Schema.Types.ObjectId,
            ref:'Product',
            required:true
        },
        size:{
            type:Number,
            required:true
        },
        quantity:{
            type:Number,
            required:true
        },
        price:{
            type:Number,
            default:0
        }

    }],
    totalPrice:{
        type:Number,
        required:true
    },
    discount:{
        type:Number,
        default:0
    },
    finalAmount:{
        type:Number,
        required:true
    },
    razorpayOrderId: {
        type: String,
        required: false  
      },
    paymentMethod:{
        type:String,
        default:"COD",
        required:true
    },
    address:{
        // type:Schema.Types.ObjectId,
        // ref:'Address',
        // required:true

        name:{
            type : String,
            required : true,
        },
       houseName:{
            type : String,
            required : true,
        },
        city:{
            type: String,
            required :true,
        },
        locality:{
            type: String,
            required :false,
            default:" "
        },
        state:{
            type:String,
            required:true
        },
        pincode: {
            type : Number,
            required:true,
        },
        phone:{
            type : String,
            required :true,
        },
        altPhone:{
            type: String,
            required :false,
            default:" "
        }
    },
    invoiceDate:{
        type:Date,
        default:Date.now
    },
    orderStatus:{
        type:String,
        required:true,
        enum:['Pending','Processing','Shipped','Delivered','Cancelled','Return Request','Returned']
    },
    paymentStatus:{
        type:String,
        required:true,
        enum:['Pending','Completed','Failed','Refunded']
    },createdOn :{
        type:Date,
        default:Date.now,
        required:true
    },
    couponApplied:{
        type:Boolean,
        default:false
    }
      
    },{timestamps: true })

const Order = mongoose.model("Order",orderSchema);
module.exports = Order;