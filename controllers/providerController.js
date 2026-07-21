const ServiceProvider = require('../models/ServiceProvider');
const ServiceRequest = require('../models/ServiceRequest');
const Notification = require('../models/Notification');
const Review = require('../models/Review');
const User = require('../models/User');
const Vehicle = require('../models/Vehicle');

// ─────────────────────────────────────
// @GET /api/providers
// Get all available providers
// ─────────────────────────────────────
const getAllProviders = async (req, res) => {
  try {
    const { serviceType, isAvailable, city } = req.query;

    // Build filter
    let filter = { isActive: true, isBanned: false };

    if (serviceType) filter.serviceType = serviceType;
    if (isAvailable)  filter.isAvailable = isAvailable === 'true';
    if (city)         filter['address.city'] = city;

    const providers = await ServiceProvider
      .find(filter)
      .select('-password -otp -otpExpiry -resetToken -resetTokenExpiry -documents')
      .sort({ rating: -1 }); // highest rated first

    res.json({
      success: true,
      count: providers.length,
      data: providers
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────
// @GET /api/providers/:id
// Get single provider
// ─────────────────────────────────────
const getProviderById = async (req, res) => {
  try {
    const provider = await ServiceProvider
      .findById(req.params.id)
      .select('-password -otp -otpExpiry -resetToken -resetTokenExpiry -documents');

    if (!provider) {
      return res.status(404).json({ message: 'Provider not found' });
    }

    // Get provider reviews
    const reviews = await Review
      .find({ providerId: req.params.id, isActive: true })
      .populate('userId', 'name profileImage')
      .sort({ createdAt: -1 })
      .limit(5);

    // Get completed jobs count
    const completedJobs = await ServiceRequest.countDocuments({
      providerId: req.params.id,
      status: 'completed'
    });

    res.json({
      success: true,
      data: {
        provider,
        recentReviews: reviews,
        completedJobs
      }
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────
// @GET /api/providers/dashboard
// Provider dashboard
// ─────────────────────────────────────
const getProviderDashboard = async (req, res) => {
  try {
    const provider = await ServiceProvider
      .findById(req.user._id)
      .select('-password -otp -otpExpiry -resetToken -resetTokenExpiry');

    if (!provider) {
      return res.status(404).json({ message: 'Provider not found' });
    }

    // Get request stats
    const totalRequests     = await ServiceRequest.countDocuments({ providerId: req.user._id });
    const pendingRequests   = await ServiceRequest.countDocuments({ providerId: req.user._id, status: 'pending' });
    const acceptedRequests  = await ServiceRequest.countDocuments({ providerId: req.user._id, status: 'accepted' });
    const ongoingRequests   = await ServiceRequest.countDocuments({ providerId: req.user._id, status: 'ongoing' });
    const completedRequests = await ServiceRequest.countDocuments({ providerId: req.user._id, status: 'completed' });
    const cancelledRequests = await ServiceRequest.countDocuments({ providerId: req.user._id, status: 'cancelled' });

    // Get recent requests
    const recentRequests = await ServiceRequest
      .find({ providerId: req.user._id })
      .populate('userId', 'name phone profileImage')
      .populate('vehicleId', 'brand model licensePlate color')
      .sort({ createdAt: -1 })
      .limit(5);

    // Get unread notifications
    const unreadNotifications = await Notification.countDocuments({
      receiverId: req.user._id,
      isRead: false
    });

    // Get recent reviews
    const recentReviews = await Review
      .find({ providerId: req.user._id })
      .populate('userId', 'name profileImage')
      .sort({ createdAt: -1 })
      .limit(3);

    res.json({
      success: true,
      data: {
        provider,
        stats: {
          totalRequests,
          pendingRequests,
          acceptedRequests,
          ongoingRequests,
          completedRequests,
          cancelledRequests,
          totalEarnings: provider.totalEarnings,
          rating: provider.rating,
          totalReviews: provider.totalReviews,
          unreadNotifications
        },
        recentRequests,
        recentReviews
      }
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────
// @PUT /api/providers/profile
// Update provider profile
// ─────────────────────────────────────
const updateProviderProfile = async (req, res) => {
  try {
    const provider = await ServiceProvider.findById(req.user._id);
    if (!provider) {
      return res.status(404).json({ message: 'Provider not found' });
    }

    const {
      name, phone, gender, dateOfBirth,
      experience, bio, address,
      location, vehicleInfo, charges,
      workingHours
    } = req.body;

    provider.name         = name         || provider.name;
    provider.phone        = phone        || provider.phone;
    provider.gender       = gender       || provider.gender;
    provider.dateOfBirth  = dateOfBirth  || provider.dateOfBirth;
    provider.experience   = experience   || provider.experience;
    provider.bio          = bio          || provider.bio;
    provider.address      = address      || provider.address;
    provider.location     = location     || provider.location;
    provider.vehicleInfo  = vehicleInfo  || provider.vehicleInfo;
    provider.charges      = charges      || provider.charges;
    provider.workingHours = workingHours || provider.workingHours;

    if (req.body.password) {
      provider.password = req.body.password;
    }

    const updated = await provider.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        _id: updated._id,
        name: updated.name,
        email: updated.email,
        phone: updated.phone,
        serviceType: updated.serviceType,
        experience: updated.experience,
        bio: updated.bio,
        address: updated.address,
        location: updated.location,
        vehicleInfo: updated.vehicleInfo,
        charges: updated.charges,
        workingHours: updated.workingHours
      }
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────
// @PUT /api/providers/availability
// Toggle availability
// ─────────────────────────────────────
const toggleAvailability = async (req, res) => {
  try {
    const provider = await ServiceProvider.findById(req.user._id);
    if (!provider) {
      return res.status(404).json({ message: 'Provider not found' });
    }

    provider.isAvailable = !provider.isAvailable;
    await provider.save();

    res.json({
      success: true,
      message: `You are now ${provider.isAvailable ? 'Available ✅' : 'Unavailable ❌'}`,
      isAvailable: provider.isAvailable
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────
// @GET /api/providers/requests
// Get all requests assigned to provider
// ─────────────────────────────────────
const getProviderRequests = async (req, res) => {
  try {
    const { status } = req.query;

    let filter = { providerId: req.user._id };
    if (status) filter.status = status;

    const requests = await ServiceRequest
      .find(filter)
      .populate('userId',   'name phone profileImage emergencyContact')
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

// ─────────────────────────────────────
// @GET /api/providers/notifications
// Get provider notifications
// ─────────────────────────────────────
const getProviderNotifications = async (req, res) => {
  try {
    const notifications = await Notification
      .find({ receiverId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({
      success: true,
      count: notifications.length,
      data: notifications
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────
// @PUT /api/providers/notifications/read
// Mark notifications as read
// ─────────────────────────────────────
const markProviderNotificationsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { receiverId: req.user._id, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAllProviders,
  getProviderById,
  getProviderDashboard,
  updateProviderProfile,
  toggleAvailability,
  getProviderRequests,
  getProviderNotifications,
  markProviderNotificationsRead
};