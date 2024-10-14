const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
    offerName: {
         type: String,
          required: true
         },
    description: { 
        type: String, 
        required: false, 
        
    },
    startDate: { 
        type: Date, 
        required: true
     },
    endDate: {
         type: Date,
          required: true 
        },
        categoryName:{
            type:String,
            required:true
        },
    discount: { 
        type: Number, 
        required: true
     }, // discount percentage or flat discount
    applicableProducts: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Product' }], // optional, if only for specific products
    minimumPurchaseAmount: {
         type: Number, 
         default: 0
         },
    isActive: {
         type: Boolean, 
         default: true
         }
});

const Offer = mongoose.model('Offer', offerSchema);
module.exports = Offer;