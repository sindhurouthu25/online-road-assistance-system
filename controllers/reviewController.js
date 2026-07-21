const Review = require('../models/Review');
const ServiceProvider = require('../models/ServiceProvider');
const ServiceRequest = require('../models/ServiceRequest');
const Notification = require('../models/Notification');

// ─────────────────────────────────────
// @POST /api/reviews
// Submit a review
// ─────────────────────────────────────
const createReview = async (req, res) => {
  try {
    const {
      providerId,
      requestId,
      rating,
      comment,
      detailedRatings,
      isAnonymous
    } = req.body;

    if (!providerId || !requestId || !rating) {
      return res.status(400).json({ message: 'Please fill all required fields' });
    }

    // Check if request exists and is completed
    const request = await ServiceRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ message: 'Service request not found' });
    }

    if (request.status !== 'completed') {
      return res.status(400).json({ message: 'Can only review completed services' });
    }

    // Check if user owns this request
    if (request.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to review this request' });
    }

    // Check if already reviewed
    if (request.isReviewed) {
      return res.status(400).json({ message: 'You have already reviewed this service' });
    }

    // Create review
    const review = await Review.create({
      userId:         req.user._id,
      providerId,
      requestId,
      rating,
      comment:        comment        || null,
      detailedRatings: detailedRatings || {},
      isAnonymous:    isAnonymous    || false
    });

    // Mark request as reviewed
    await ServiceRequest.findByIdAndUpdate(requestId, {
      isReviewed: true
    });

    // Update provider average rating
    const allReviews = await Review.find({
      providerId,
      isActive: true
    });

    const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0)
                      / allReviews.length;

    // Calculate detailed ratings averages
    const avgPunctuality = allReviews
      .filter(r => r.detailedRatings?.punctuality)
      .reduce((sum, r) => sum + r.detailedRatings.punctuality, 0)
      / allReviews.filter(r => r.detailedRatings?.punctuality).length || 0;

    const avgBehavior = allReviews
      .filter(r => r.detailedRatings?.behavior)
      .reduce((sum, r) => sum + r.detailedRatings.behavior, 0)
      / allReviews.filter(r => r.detailedRatings?.behavior).length || 0;

    const avgWorkQuality = allReviews
      .filter(r => r.detailedRatings?.workQuality)
      .reduce((sum, r) => sum + r.detailedRatings.workQuality, 0)
      / allReviews.filter(r => r.detailedRatings?.workQuality).length || 0;

    await ServiceProvider.findByIdAndUpdate(providerId, {
      rating:       parseFloat(avgRating.toFixed(1)),
      totalReviews: allReviews.length
    });

    // Notify provider
    await Notification.create({
      receiverId:    providerId,
      receiverType:  'provider',
      title:         'New Review Received! ⭐',
      message:       `You received a ${rating} star review. ${comment || ''}`,
      type:          'review_received',
      referenceId:   review._id,
      referenceType: 'Review'
    });

    res.status(201).json({
      success: true,
      message: 'Review submitted successfully',
      data: review
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────
// @GET /api/reviews/provider/:id
// Get all reviews of a provider
// ─────────────────────────────────────
const getProviderReviews = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const total = await Review.countDocuments({
      providerId: req.params.id,
      isActive: true
    });

    const reviews = await Review
      .find({ providerId: req.params.id, isActive: true })
      .populate('userId',    'name profileImage')
      .populate('requestId', 'serviceType createdAt')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    // Calculate rating breakdown
    const allReviews = await Review.find({
      providerId: req.params.id,
      isActive: true
    });

    const ratingBreakdown = {
      5: allReviews.filter(r => r.rating === 5).length,
      4: allReviews.filter(r => r.rating === 4).length,
      3: allReviews.filter(r => r.rating === 3).length,
      2: allReviews.filter(r => r.rating === 2).length,
      1: allReviews.filter(r => r.rating === 1).length,
    };

    const avgRating = allReviews.length > 0
      ? allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length
      : 0;

    res.json({
      success: true,
      count: reviews.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      avgRating: parseFloat(avgRating.toFixed(1)),
      ratingBreakdown,
      data: reviews
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────
// @GET /api/reviews/my-reviews
// Get all reviews given by logged in user
// ─────────────────────────────────────
const getMyReviews = async (req, res) => {
  try {
    const reviews = await Review
      .find({ userId: req.user._id, isActive: true })
      .populate('providerId', 'name serviceType profileImage rating')
      .populate('requestId',  'serviceType createdAt finalPrice')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: reviews.length,
      data: reviews
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────
// @PUT /api/reviews/:id/reply
// Provider replies to a review
// ─────────────────────────────────────
const replyToReview = async (req, res) => {
  try {
    const { comment } = req.body;

    if (!comment) {
      return res.status(400).json({ message: 'Please provide a reply' });
    }

    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    // Check if provider owns this review
    if (review.providerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Check if already replied
    if (review.providerReply.comment) {
      return res.status(400).json({ message: 'You have already replied to this review' });
    }

    review.providerReply = {
      comment,
      repliedAt: new Date()
    };

    await review.save();

    // Notify user
    await Notification.create({
      receiverId:    review.userId,
      receiverType:  'user',
      title:         'Provider Replied to Your Review!',
      message:       `A provider has replied to your review: "${comment}"`,
      type:          'general',
      referenceId:   review._id,
      referenceType: 'Review'
    });

    res.json({
      success: true,
      message: 'Reply added successfully',
      data: review
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────
// @PUT /api/reviews/:id/helpful
// Mark review as helpful
// ─────────────────────────────────────
const markHelpful = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    review.helpful += 1;
    await review.save();

    res.json({
      success: true,
      message: 'Marked as helpful',
      helpful: review.helpful
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────
// @DELETE /api/reviews/:id
// Delete a review
// ─────────────────────────────────────
const deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    // Check ownership
    if (review.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Soft delete
    review.isActive = false;
    await review.save();

    // Recalculate provider rating
    const allReviews = await Review.find({
      providerId: review.providerId,
      isActive: true
    });

    const avgRating = allReviews.length > 0
      ? allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length
      : 0;

    await ServiceProvider.findByIdAndUpdate(review.providerId, {
      rating:       parseFloat(avgRating.toFixed(1)),
      totalReviews: allReviews.length
    });

    res.json({
      success: true,
      message: 'Review deleted successfully'
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createReview,
  getProviderReviews,
  getMyReviews,
  replyToReview,
  markHelpful,
  deleteReview
};