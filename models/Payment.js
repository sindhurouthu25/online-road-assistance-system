const mongoose = require('mongoose');
const paymentSchema = new mongoose.Schema({
    userId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    providerId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ServiceProvider',
        required: true,
        unique: true
    },
    requestId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ServiceRequest',
        required: true,
        unique: true
    },
    amount:{
        type: Number,
        required: true
    },
    currency:{
        type: String,
        default: 'INR'
    },
    method:{
        type: String,
        enum: ['cash','upi','card','netbanking','wallet'],
        required: true
    },
    transactionId:{
        type: String,
        default: null
    },
    transactionDate:{
        type: Date,
        default: null
    },
    status:{
        type: String,
        enum: ['pending','completed','failed','refunded'],
        default: 'pending'
    },
    breakdown:{
        baseCharge: { type: Number,default: 0},
        distanceCharge: { type: Number, default: 0},
        tax: {type: Number, default: 0},
        discount:{ type: Number, default: 0},
        total: {type: Number, default: 0}
    },
    refund: {
        amount: {type: Number, default: null},
        reason: {type: String, default: null},
        refundedAt: {type: Date, default: null}
    },
    receiptUrl:{type:String,default:null},
    notes:{type:String,default:null}
}, {timestamps:true});
module.exports=mongoose.model('Payment',paymentSchema);