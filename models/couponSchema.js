
const mongoose = require("mongoose");

const { Schema } = mongoose;

const couponSchema = new Schema({
    couponName: {
        type: String,
        required: true,
        unique: true
    },
    couponCode: {  // Adding couponCode if you need it
        type: String,
        required: true,
        unique: true
    },
    startDate: {
        type: Date,
        default: Date.now,
    },
    endDate: {
        type: Date,
        required: true
    },
    discount: {  // Assuming this is the discount you want to apply
        type: Number,
        required: true
    },
    minimumPrice: {
        type: Number,
        required: true
    },
    isList: {
        type: Boolean,
        default: true
    },
    userId: [{  // Array of user references; adjust if it's a single user
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }]
});

const Coupon = mongoose.model("Coupon", couponSchema);

module.exports = Coupon;





