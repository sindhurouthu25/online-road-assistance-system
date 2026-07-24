const mongoose = require('mongoose');
const serviceRequestSchema=new mongoose.Schema({
//eople Involved
userId:{
    type: mongoose.Schema.Types.ObjectId,
    ref:'User',
    required: true
},
providerId:{
    type: mongoose.Schema.Types.ObjectId,
    ref:'ServiceProvider',
    default:null
},
vehicleId:{
    type:mongoose.Schema.Types.ObjectId,
    ref:'vehicle',
    required:true
},
serviceType:{
    type: String,
    enum:['towing','fuel','tire','mechanic','battery'],
    required:true
},
description:{
    type:String,
    default:null
},
images:[{type: String}],
userLocation:{
    latitude:{type:Number,required:true},
    longitude:{type:Number,required:true},
    address:{type:String,default:null}
},
providerLocation:{
    latitude:{type:Number,default:null},
    longitude:{type:Number,default:null},
},
status:{
    type:String,
    enum:[
        'pending',
        'accepted',
        'ongoing',
        'completed',
        'cancelled',
    ],
    default:'pending'
},
cancelReason:{type:String,default:null},
cancelledBy:{
    type:String,
    enum:['user','provider','admin',null],
    default:null
},
otp:{type:String,default:null},
isOtpVerification:{type:Boolean,default:false},

estimatedPrice:{type:Number,default:0},
finalPrice:{type:Number,default:0},
distance:{type:Number,default:0},

paymentStatus:{
    type: String,
    enum:['pending','paid','failed','refunded'],
    default:'pending'
},
paymentMethod:{
    type:String,
    enum:['cash','online',null],
    default:null
},
estimatedTime:{type:Number,default:null},
acceptedAt:{type:Date,default:null},
startedAt:{type:Date,default:null},
completedAt:{type:Date,default:null},
cancelledAt:{type:Date,default:null},
timeline:[
    {
        status:{type:String},
        message:{type:String},
        timestamp:{type:Date,default:Date.now}
    }
],
isReviewed:{type:Boolean, default:false},
providerNotes:{type:String,default:null}
},{ timestamps: true});

module.exports=mongoose.model('ServiceRequest',serviceRequestSchema);
