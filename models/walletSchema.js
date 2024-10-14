const mongoose = require('mongoose');
const { Schema } = mongoose;
const { v4: uuidv4 } = require('uuid');


const walletSchema = new Schema({


    userId: {
        type:Schema.Types.ObjectId,
        ref:"User",
        required : true
    },
    
    walletBalance: {
        type: Number,
        required: true,
        default: 0
    },
    
    transactions: [
        {
            transactionId:{
                type:String,
                default: () => uuidv4().split('-')[0],
                required:true
            },
            type: {
                type: String,
                enum: ['credit', 'debit'], 
                required: true
            },
            amount: {
                type: Number,
                required: true
            },
            date: {
                type: Date,
                default: Date.now 
            },
            description: {
                type: String,
                required: true 
            }
        }
    ]
});

const Wallet = mongoose.model("Wallet", walletSchema);

module.exports = Wallet;
