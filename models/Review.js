
const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  // People Involved
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  providerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'ServiceProvider', 
    required: true 
  },
  requestId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'ServiceRequest', 
    required: true,
    unique: true  // one review per request
  },

  // Rating
  rating: { 
    type: Number, 
    required: true, 
    min: 1, 
    max: 5 
  },

  // Detailed Ratings
  detailedRatings: {
    punctuality:  { type: Number, min: 1, max: 5, 
      default: null },
    behavior:     { type: Number, min: 1, max: 5,
       default: null },
    workQuality:  { type: Number, min: 1, max: 5, 
      default: null },
    pricing:      { type: Number, min: 1, max: 5, 
      default: null }
  },

  // Review Content
  comment: { 
    type: String, 
    default: null 
  },
  images: [{ type: String }], // proof photos

  // Privacy
  isAnonymous: { 
    type: Boolean, 
    default: false 
  },

  // Provider Reply
  providerReply: {
    comment:   { type: String, default: null },
    repliedAt: { type: Date,   default: null }
  },

  // Helpful Count
  helpful: { type: Number, default: 0 },

  // Status
  isActive: { type: Boolean, default: true }

}, { timestamps: true });

module.exports = mongoose.model('Review', reviewSchema);