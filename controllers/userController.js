const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const ServiceRequest = require('../models/ServiceRequest');
const Notification = require('../models/Notification');

// ─────────────────────────────────────
// @GET /api/users/profile
// ─────────────────────────────────────
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password -otp -otpExpiry -resetToken -resetTokenExpiry');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      success: true,
      data: user
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────
// @PUT /api/users/profile
// ─────────────────────────────────────
const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const {
      name, phone, gender,
      dateOfBirth, address,
      emergencyContact, location
    } = req.body;

    // Update fields
    user.name            = name            || user.name;
    user.phone           = phone           || user.phone;
    user.gender          = gender          || user.gender;
    user.dateOfBirth     = dateOfBirth     || user.dateOfBirth;
    user.address         = address         || user.address;
    user.emergencyContact = emergencyContact || user.emergencyContact;
    user.location        = location        || user.location;

    // Update password if sent
    if (req.body.password) {
      user.password = req.body.password;
    }

    const updatedUser = await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        gender: updatedUser.gender,
        dateOfBirth: updatedUser.dateOfBirth,
        address: updatedUser.address,
        emergencyContact: updatedUser.emergencyContact,
        location: updatedUser.location,
        profileImage: updatedUser.profileImage
      }
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────
// @POST /api/users/vehicles
// ─────────────────────────────────────
const addVehicle = async (req, res) => {
  try {
    const {
      brand, model, year, color,
      licensePlate, fuelType, vehicleType,
      insurance, mileage
    } = req.body;

    if (!brand || !model || !year || !licensePlate || !fuelType || !vehicleType) {
      return res.status(400).json({ message: 'Please fill all required fields' });
    }

    // Check if license plate already exists
    const plateExists = await Vehicle.findOne({ licensePlate: licensePlate.toUpperCase() });
    if (plateExists) {
      return res.status(400).json({ message: 'Vehicle with this license plate already exists' });
    }

    const vehicle = await Vehicle.create({
      userId: req.user._id,
      brand,
      model,
      year,
      color:        color        || null,
      licensePlate: licensePlate.toUpperCase(),
      fuelType,
      vehicleType,
      insurance:    insurance    || {},
      mileage:      mileage      || 0
    });

    res.status(201).json({
      success: true,
      message: 'Vehicle added successfully',
      data: vehicle
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────
// @GET /api/users/vehicles
// ─────────────────────────────────────
const getUserVehicles = async (req, res) => {
  try {
    const vehicles = await Vehicle
      .find({ userId: req.user._id, isActive: true })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: vehicles.length,
      data: vehicles
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────
// @PUT /api/users/vehicles/:id
// ─────────────────────────────────────
const updateVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);

    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    // Check ownership
    if (vehicle.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const {
      brand, model, year, color,
      fuelType, vehicleType,
      insurance, mileage, lastServiceDate
    } = req.body;

    vehicle.brand           = brand           || vehicle.brand;
    vehicle.model           = model           || vehicle.model;
    vehicle.year            = year            || vehicle.year;
    vehicle.color           = color           || vehicle.color;
    vehicle.fuelType        = fuelType        || vehicle.fuelType;
    vehicle.vehicleType     = vehicleType     || vehicle.vehicleType;
    vehicle.insurance       = insurance       || vehicle.insurance;
    vehicle.mileage         = mileage         || vehicle.mileage;
    vehicle.lastServiceDate = lastServiceDate || vehicle.lastServiceDate;

    const updated = await vehicle.save();

    res.json({
      success: true,
      message: 'Vehicle updated successfully',
      data: updated
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────
// @DELETE /api/users/vehicles/:id
// ─────────────────────────────────────
const deleteVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);

    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    // Check ownership
    if (vehicle.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Soft delete
    vehicle.isActive = false;
    await vehicle.save();

    res.json({
      success: true,
      message: 'Vehicle deleted successfully'
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────
// @GET /api/users/dashboard
// ─────────────────────────────────────
const getUserDashboard = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password -otp -otpExpiry -resetToken -resetTokenExpiry');

    // Get request stats
    const totalRequests     = await ServiceRequest.countDocuments({ userId: req.user._id });
    const pendingRequests   = await ServiceRequest.countDocuments({ userId: req.user._id, status: 'pending' });
    const completedRequests = await ServiceRequest.countDocuments({ userId: req.user._id, status: 'completed' });
    const cancelledRequests = await ServiceRequest.countDocuments({ userId: req.user._id, status: 'cancelled' });

    // Get recent requests
    const recentRequests = await ServiceRequest
      .find({ userId: req.user._id })
      .populate('providerId', 'name phone serviceType rating')
      .populate('vehicleId', 'brand model licensePlate')
      .sort({ createdAt: -1 })
      .limit(5);

    // Get vehicles count
    const totalVehicles = await Vehicle.countDocuments({
      userId: req.user._id,
      isActive: true
    });

    // Get unread notifications
    const unreadNotifications = await Notification.countDocuments({
      receiverId: req.user._id,
      isRead: false
    });

    res.json({
      success: true,
      data: {
        user,
        stats: {
          totalRequests,
          pendingRequests,
          completedRequests,
          cancelledRequests,
          totalVehicles,
          unreadNotifications
        },
        recentRequests
      }
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────
// @GET /api/users/notifications
// ─────────────────────────────────────
const getNotifications = async (req, res) => {
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
// @PUT /api/users/notifications/read
// ─────────────────────────────────────
const markNotificationsRead = async (req, res) => {
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

// ─────────────────────────────────────
// @DELETE /api/users/account
// ─────────────────────────────────────
const deleteAccount = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Soft delete
    user.isActive = false;
    await user.save();

    res.json({
      success: true,
      message: 'Account deactivated successfully'
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getUserProfile,
  updateUserProfile,
  addVehicle,
  getUserVehicles,
  updateVehicle,
  deleteVehicle,
  getUserDashboard,
  getNotifications,
  markNotificationsRead,
  deleteAccount
};