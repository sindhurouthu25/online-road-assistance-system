const mongoose = require('mongoose');
const notificationSchema = new mongoose.Schema({
    receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
    },
    receiverType: {
        type: String,
        enum: ['user','provider','admin'],
        required: true
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    type:{
        type: String,
        enum:[
            'requested_created',
            'requested_accepted',
            'request_ongoing',
            'request_completed',
            'request_cancelled',
            'payment_received',
            'review received',
            'account_verified',
            'general'
        ],
        default: 'general'
    },
    referenceId:{
        type: mongoose.Schema.Types.ObjectId,
        default: null
    },
    referenceType:{
        type: String,
        enum:['ServiceRequest','Payment','Review',null],
        default:null
    },
    isRead:{type:Boolean,default:false},
    readAt:{type:Date,default:null}
}, {timestamps:true});
module.exports=mongoose.model('Notifications',notificationSchema);
