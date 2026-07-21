const mongoose = require('mongoose');
const vehicleSchema = new mongoose.Schema({
    userId:{
        type: mongoose.Schema.Types.ObjectId,
        ref:'User',
        required: true
    },
    brand:{
        type: String,
        required: true,
        trim: true
    },
    model: {
        type: String,
        required: true,
        trim: true
    },
    year:{
        type: Number,
        required: true
    },
    color:{
        type: String,
        default: null
    },
    licensePlate:{
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true
    },
    fuelType: {
        type: String,
        enum: ['petrol','diesel','electric','cng','hybrid'],
        required: true
    },
    vehicleType:{
        type: String,
        enum: ['car','bike','truck','bus','auto','van'],
        required: true
    },
    insurance:{
        policyNumber: {type: String, default: null},
        provider: {type: String, default: null},
        ExpiryDate: {type: Date, default: null}
    },
    lastServiceDate: {type: Date, default: null},
    mileage: {type: Number, default: 0},

    images:[{type: String}],

    isPrimary: {type: Boolean,default: false},
    isActive: {type: Boolean,default: true}
}, {timestamps: true});

module.exports = mongoose.model('vehicle',vehicleSchema);