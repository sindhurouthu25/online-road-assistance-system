const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const serviceProviderSchema = new mongoose.Schema({
    name:{
        type:String,
        required: true,
        trim:true
     },
    email:{
        type:String,
        required:true,
        unique:true,
        lowercase:true,
        trim:true,
    },
    password:{
        type: String,
        required:true
    },
    phone:{
        type:String,
        required:true,
        unique:true,
    },
    serviceType:{
        type:String,
        enum: ['towing','fuel','tire','mechanic','battery'],
        required: true
    },
    profileImage:{
        type:String,
        default:null,
    },
    gender:{
        type:String,
        enum:['male','female', 'other'], 
        default: null 
    },
    dateOfBirth: { 
        type: Date, 
        default: null 
    },
    experience:{
        type:Number,
        default:0,
    },
    bio:{
        type:String,
        default:null,
    },
     // Address
    address: {
        street:  { type: String, default: null },
        city:    { type: String, default: null },
        state:   { type: String, default: null },
        pincode: { type: String, default: null }
    },

  // Location
    location: {
        latitude:  { type: Number, default: null },
        longitude: { type: Number, default: null }
    }, 
    vehicleInfo:{
        vehicleNumber:{type:String,default:null},
        vehicleType:{type:String,default:null},
        vehicleModal:{type:String,default:null}
    },
    documents:{
        license:{type:String,default:null},
        certificate:{type:String,default:null},
        idproof:{type:String,default:null}
    },
    isAvailable: {
    type: Boolean,
    default: true
    },
    workingHours:{
        from:{type:String,default:"08:00"},
        to:{type:String,default:"20:00"}
    },
    isVerified:{type:Boolean,default:false},
    isActive:{type:Boolean,default:true},
    isBanned:{type:Boolean,default:false},

    rating:{type: Number, default:0},
    totalReviews:{type: Number, default:0},

    completedJobs:{type:Number,default:0},
    cancelledJobs:{type:Number,default:0},
    totalEarnings:{type:Number,default:0},

    charges:{
        baseCharge:{type:Number,default:0},
        perKmCharge:{type:Number,default:0},
    },
    //Auth
    otp:{type:String,default:null},
    otpExpiry:{type:Date,default:null},
    resetToken:{type:String,default:null},
    resetTokenExpiry:{type:Date,default:null},
    lastLogin:{type:Date,default:null}
},{timestamps:true});

//Hash password before saving
serviceProviderSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

serviceProviderSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports =
  mongoose.models.ServiceProvider ||
  mongoose.model('ServiceProvider', serviceProviderSchema);