const ServiceRequest = require('../models/ServiceRequest');
const ServiceProvider = require('../models/ServiceProvider');
const User = require('../models/User');
const Notification = require('../models/Notification');
const Payment = require('../models/Payment');
const Vehicle = require('../models/Vehicle');

// ─────────────────────────────────────
// @POST /api/services/request
// Create a new service request
// ─────────────────────────────────────
const createServiceRequest = async (req, res) => {
  try {
    const {
      vehicleId, serviceType,
      userLocation, description,
      estimatedPrice
    } = req.body;

    if (!vehicleId || !serviceType || !userLocation) {
      return res.status(400).json({ message: 'Please fill all required fields' });
    }

    // Generate OTP for service verification
    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    // Create request
    const serviceRequest = await ServiceRequest.create({
      userId: req.user._id,
      vehicleId,
      serviceType,
      userLocation,
      description:    description    || null,
      estimatedPrice: estimatedPrice || 0,
      otp,
      status: 'pending',
      timeline: [{
        status:    'pending',
        message:   'Service request created',
        timestamp: new Date()
      }]
    });

    // Update user stats
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { totalRequests: 1 }
    });

    // Notify all available providers of same service type
    const availableProviders = await ServiceProvider.find({
      serviceType,
      isAvailable: true,
      isActive: true,
      isBanned: false
    });

    // Send notification to all available providers
    const providerNotifications = availableProviders.map(provider => ({
      receiverId:    provider._id,
      receiverType:  'provider',
      title:         'New Service Request!',
      message:       `New ${serviceType} request near your area. Tap to accept.`,
      type:          'request_created',
      referenceId:   serviceRequest._id,
      referenceType: 'ServiceRequest'
    }));

    if (providerNotifications.length > 0) {
      await Notification.insertMany(providerNotifications);
    }

    // Notify user
    await Notification.create({
      receiverId:    req.user._id,
      receiverType:  'user',
      title:         'Request Created!',
      message:       `Your ${serviceType} request has been created. Looking for providers...`,
      type:          'request_created',
      referenceId:   serviceRequest._id,
      referenceType: 'ServiceRequest'
    });

    res.status(201).json({
      success: true,
      message: 'Service request created successfully',
      data: {
        ...serviceRequest._doc,
        otp // show OTP to user
      }
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────
// @GET /api/services/my-requests
// Get all requests of logged in user
// ─────────────────────────────────────
const getUserRequests = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    let filter = { userId: req.user._id };
    if (status) filter.status = status;

    const total = await ServiceRequest.countDocuments(filter);

    const requests = await ServiceRequest
      .find(filter)
      .populate('providerId', 'name phone serviceType rating profileImage')
      .populate('vehicleId',  'brand model licensePlate color vehicleType')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({
      success: true,
      count: requests.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      data: requests
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────
// @GET /api/services/:id
// Get single service request
// ─────────────────────────────────────
const getRequestById = async (req, res) => {
  try {
    const request = await ServiceRequest
      .findById(req.params.id)
      .populate('userId',     'name phone profileImage emergencyContact')
      .populate('providerId', 'name phone serviceType rating profileImage vehicleInfo charges')
      .populate('vehicleId',  'brand model licensePlate color vehicleType fuelType');

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    res.json({
      success: true,
      data: request
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────
// @PUT /api/services/:id/accept
// Provider accepts a request
// ─────────────────────────────────────
const acceptRequest = async (req, res) => {
  try {
    const request = await ServiceRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ message: 'Request is no longer available' });
    }

    const { estimatedTime, estimatedPrice } = req.body;

    // Update request
    request.providerId     = req.user._id;
    request.status         = 'accepted';
    request.estimatedTime  = estimatedTime  || null;
    request.estimatedPrice = estimatedPrice || request.estimatedPrice;
    request.acceptedAt     = new Date();

    // Add to timeline
    request.timeline.push({
      status:    'accepted',
      message:   'Provider accepted your request',
      timestamp: new Date()
    });

    await request.save();

    // Update provider availability
    await ServiceProvider.findByIdAndUpdate(req.user._id, {
      isAvailable: false
    });

    // Notify user
    const provider = await ServiceProvider
      .findById(req.user._id)
      .select('name phone serviceType');

    await Notification.create({
      receiverId:    request.userId,
      receiverType:  'user',
      title:         'Provider Accepted! 🎉',
      message:       `${provider.name} has accepted your request and is on the way!`,
      type:          'request_accepted',
      referenceId:   request._id,
      referenceType: 'ServiceRequest'
    });

    res.json({
      success: true,
      message: 'Request accepted successfully',
      data: request
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────
// @PUT /api/services/:id/start
// Provider starts the service (verify OTP)
// ─────────────────────────────────────
const startService = async (req, res) => {
  try {
    const { otp } = req.body;
    const request = await ServiceRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    if (request.status !== 'accepted') {
      return res.status(400).json({ message: 'Request cannot be started' });
    }

    // Verify OTP
    if (request.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    // Update request
    request.status        = 'ongoing';
    request.isOtpVerified = true;
    request.startedAt     = new Date();

    // Add to timeline
    request.timeline.push({
      status:    'ongoing',
      message:   'Service has started',
      timestamp: new Date()
    });

    await request.save();

    // Notify user
    await Notification.create({
      receiverId:    request.userId,
      receiverType:  'user',
      title:         'Service Started! 🔧',
      message:       'Your service has started. OTP verified successfully.',
      type:          'request_ongoing',
      referenceId:   request._id,
      referenceType: 'ServiceRequest'
    });

    res.json({
      success: true,
      message: 'Service started successfully',
      data: request
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────
// @PUT /api/services/:id/complete
// Provider completes the service
// ─────────────────────────────────────
const completeService = async (req, res) => {
  try {
    const { finalPrice, paymentMethod, providerNotes } = req.body;
    const request = await ServiceRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    if (request.status !== 'ongoing') {
      return res.status(400).json({ message: 'Service is not ongoing' });
    }

    // Update request
    request.status        = 'completed';
    request.finalPrice    = finalPrice    || request.estimatedPrice;
    request.paymentMethod = paymentMethod || 'cash';
    request.providerNotes = providerNotes || null;
    request.completedAt   = new Date();

    // Add to timeline
    request.timeline.push({
      status:    'completed',
      message:   'Service completed successfully',
      timestamp: new Date()
    });

    await request.save();

    // Update provider stats
    await ServiceProvider.findByIdAndUpdate(request.providerId, {
      $inc: {
        completedJobs:  1,
        totalEarnings:  finalPrice || request.estimatedPrice
      },
      isAvailable: true
    });

    // Update user stats
    await User.findByIdAndUpdate(request.userId, {
      $inc: { completedRequests: 1 }
    });

    // Create payment record
    await Payment.create({
      userId:    request.userId,
      providerId: request.providerId,
      requestId: request._id,
      amount:    finalPrice || request.estimatedPrice,
      method:    paymentMethod || 'cash',
      status:    'completed',
      transactionDate: new Date(),
      breakdown: {
        total: finalPrice || request.estimatedPrice
      }
    });

    // Notify user
    await Notification.create({
      receiverId:    request.userId,
      receiverType:  'user',
      title:         'Service Completed! ✅',
      message:       `Service completed. Total amount: ₹${finalPrice || request.estimatedPrice}. Please rate your experience.`,
      type:          'request_completed',
      referenceId:   request._id,
      referenceType: 'ServiceRequest'
    });

    res.json({
      success: true,
      message: 'Service completed successfully',
      data: request
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────
// @PUT /api/services/:id/cancel
// Cancel a service request
// ─────────────────────────────────────
const cancelRequest = async (req, res) => {
  try {
    const { cancelReason } = req.body;
    const request = await ServiceRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    if (['completed', 'cancelled'].includes(request.status)) {
      return res.status(400).json({ message: 'Request cannot be cancelled' });
    }

    // Determine who cancelled
    const cancelledBy = request.userId.toString() === req.user._id.toString()
      ? 'user' : 'provider';

    // Update request
    request.status       = 'cancelled';
    request.cancelReason = cancelReason || null;
    request.cancelledBy  = cancelledBy;
    request.cancelledAt  = new Date();

    // Add to timeline
    request.timeline.push({
      status:    'cancelled',
      message:   `Request cancelled by ${cancelledBy}`,
      timestamp: new Date()
    });

    await request.save();

    // Update stats
    if (cancelledBy === 'user') {
      await User.findByIdAndUpdate(req.user._id, {
        $inc: { cancelledRequests: 1 }
      });
    }

    if (request.providerId) {
      await ServiceProvider.findByIdAndUpdate(request.providerId, {
        $inc: { cancelledJobs: 1 },
        isAvailable: true
      });
    }

    // Notify other party
    const notifyId   = cancelledBy === 'user' ? request.providerId : request.userId;
    const notifyType = cancelledBy === 'user' ? 'provider' : 'user';

    if (notifyId) {
      await Notification.create({
        receiverId:    notifyId,
        receiverType:  notifyType,
        title:         'Request Cancelled ❌',
        message:       `Request has been cancelled by ${cancelledBy}. Reason: ${cancelReason || 'No reason provided'}`,
        type:          'request_cancelled',
        referenceId:   request._id,
        referenceType: 'ServiceRequest'
      });
    }

    res.json({
      success: true,
      message: 'Request cancelled successfully',
      data: request
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────
// @GET /api/services/pending
// Get all pending requests (for providers)
// ─────────────────────────────────────
const getPendingRequests = async (req, res) => {
  try {
    const { serviceType } = req.query;

    let filter = { status: 'pending' };
    if (serviceType) filter.serviceType = serviceType;

    const requests = await ServiceRequest
      .find(filter)
      .populate('userId',   'name phone profileImage')
      .populate('vehicleId','brand model licensePlate color vehicleType')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: requests.length,
      data: requests
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createServiceRequest,
  getUserRequests,
  getRequestById,
  acceptRequest,
  startService,
  completeService,
  cancelRequest,
  getPendingRequests
};