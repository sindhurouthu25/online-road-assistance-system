const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  // Basic Info
  name: { 
    type: String, 
    required: true, 
    trim: true 
  },
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    lowercase: true,
    trim: true
  },
  password: { 
    type: String, 
    required: true 
  },  
  phone: { 
    type: String, 
    required: true,
    unique: true
  },
  role: { 
    type: String, 
    enum: ['user', 'admin'], 
    default: 'user' 
  },

  // Profile
  profileImage: { 
    type: String, 
    default: null 
  },
  gender: { 
    type: String, 
    enum: ['male', 'female', 'other'], 
    default: null 
  },
  dateOfBirth: { 
    type: Date, 
    default: null 
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

  // Emergency Contact
  emergencyContact: {
    name:  { type: String, default: null },
    phone: { type: String, default: null },
    relation: { type: String, default: null }
  },

  // Account Status
  isVerified:  { type: Boolean, default: false },
  isActive:    { type: Boolean, default: true  },
  isBanned:    { type: Boolean, default: false },

  // Stats
  totalRequests:   { type: Number, default: 0 },
  completedRequests: { type: Number, default: 0 },
  cancelledRequests: { type: Number, default: 0 },

  // Auth
  otp:           { type: String,  default: null },
  otpExpiry:     { type: Date,    default: null },
  resetToken:    { type: String,  default: null },
  resetTokenExpiry: { type: Date, default: null },
  lastLogin:     { type: Date,    default: null }

}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

// Compare password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.models.User || mongoose.model('User', userSchema);