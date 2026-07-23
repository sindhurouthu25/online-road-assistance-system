const jwt = require('jsonwebtoken');
const User = require('../models/user');
const ServiceProvider = require('../models/ServiceProvider');
const Notification = require('../models/Notification');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// ─────────────────────────────────────
// @POST /api/auth/register
// ─────────────────────────────────────
const registerUser = async (req, res) => {
  try {
    const { name, email, password, phone, role, gender, dateOfBirth } = req.body;

    // Validate required fields
    if (!name || !email || !password || !phone) {
      return res.status(400).json({ message: 'Please fill all required fields' });
    }

    // Check if email exists
    const emailExists = await User.findOne({ email });
    if (emailExists) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Check if phone exists
    const phoneExists = await User.findOne({ phone });
    if (phoneExists) {
      return res.status(400).json({ message: 'Phone number already registered' });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      phone,
      role: role || 'user',
      gender: gender || null,
      dateOfBirth: dateOfBirth || null,
      lastLogin: new Date()
    });

    // Send welcome notification
    await Notification.create({
      receiverId: user._id,
      receiverType: 'user',
      title: 'Welcome to Online Road Assistance!',
      message: `Hello ${user.name}, your account has been created successfully.`,
      type: 'general'
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isVerified: user.isVerified,
        token: generateToken(user._id)
      }
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────
// @POST /api/auth/login
// ─────────────────────────────────────
const loginUser = async (req, res) => {
  try {
    const { email,password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Check if banned
    if (user.isBanned) {
      return res.status(403).json({ message: 'Your account has been banned' });
    }

    // Check if active
    if (!user.isActive) {
      return res.status(403).json({ message: 'Your account is deactivated' });
    }

    // Check password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        profileImage: user.profileImage,
        isVerified: user.isVerified,
        totalRequests: user.totalRequests,
        token: generateToken(user._id)
      }
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────
// @POST /api/auth/register-provider
// ─────────────────────────────────────
const registerProvider = async (req, res) => {
  try {
    const {
      name, email, password, phone,
      serviceType, experience, bio,
      gender, dateOfBirth
    } = req.body;

    // Validate required fields
    if (!name || !email || !password || !phone || !serviceType) {
      return res.status(400).json({ message: 'Please fill all required fields' });
    }

    // Check email
    const emailExists = await ServiceProvider.findOne({ email });
    if (emailExists) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Check phone
    const phoneExists = await ServiceProvider.findOne({ phone });
    if (phoneExists) {
      return res.status(400).json({ message: 'Phone number already registered' });
    }

    // Create provider
    const provider = await ServiceProvider.create({
      name,
      email,
      password,
      phone,
      serviceType,
      experience: experience || 0,
      bio: bio || null,
      gender: gender || null,
      dateOfBirth: dateOfBirth || null,
      lastLogin: new Date()
    });

    // Send welcome notification
    await Notification.create({
      receiverId: provider._id,
      receiverType: 'provider',
      title: 'Welcome to Online Road Assistance!',
      message: `Hello ${provider.name}, your provider account has been created. Please wait for admin verification.`,
      type: 'general'
    });

    res.status(201).json({
      success: true,
      message: 'Provider registered successfully. Pending admin verification.',
      data: {
        _id: provider._id,
        name: provider.name,
        email: provider.email,
        phone: provider.phone,
        serviceType: provider.serviceType,
        isVerified: provider.isVerified,
        role: 'provider',
        token: generateToken(provider._id)
      }
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────
// @POST /api/auth/login-provider
// ─────────────────────────────────────
const loginProvider = async (req, res) => {
  try {
    const { email,password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    // Find provider
    const provider = await ServiceProvider.findOne({ email });
    if (!provider) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Check if banned
    if (provider.isBanned) {
      return res.status(403).json({ message: 'Your account has been banned' });
    }

    // Check if active
    if (!provider.isActive) {
      return res.status(403).json({ message: 'Your account is deactivated' });
    }

    // Check password
    const isMatch = await provider.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Update last login
    provider.lastLogin = new Date();
    await provider.save();

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        _id: provider._id,
        name: provider.name,
        email: provider.email,
        phone: provider.phone,
        serviceType: provider.serviceType,
        profileImage: provider.profileImage,
        isVerified: provider.isVerified,
        isAvailable: provider.isAvailable,
        rating: provider.rating,
        totalReviews: provider.totalReviews,
        completedJobs: provider.completedJobs,
        totalEarnings: provider.totalEarnings,
        role: 'provider',
        token: generateToken(provider._id)
      }
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────
// @POST /api/auth/forgot-password
// ─────────────────────────────────────
const forgotPassword = async (req, res) => {
  try {
    const { email, userType } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Please provide email' });
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    let account;

    if (userType === 'provider') {
      account = await ServiceProvider.findOne({ email });
    } else {
      account = await User.findOne({ email });
    }

    if (!account) {
      return res.status(404).json({ message: 'No account found with this email' });
    }

    // Save OTP
    account.otp = otp;
    account.otpExpiry = otpExpiry;
    await account.save();

    // In real project send OTP via email/SMS
    // For now return OTP in response (testing only)
    res.json({
      success: true,
      message: 'OTP sent successfully',
      otp: otp // remove in production!
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────
// @POST /api/auth/reset-password
// ─────────────────────────────────────
const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword, userType } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: 'Please fill all fields' });
    }

    let account;
    if (userType === 'provider') {
      account = await ServiceProvider.findOne({ email });
    } else {
      account = await User.findOne({ email });
    }

    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }

    // Check OTP
    if (account.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    // Check OTP expiry
    if (account.otpExpiry < new Date()) {
      return res.status(400).json({ message: 'OTP has expired' });
    }

    // Update password
    account.password = newPassword;
    account.otp = null;
    account.otpExpiry = null;
    await account.save();

    res.json({
      success: true,
      message: 'Password reset successfully'
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
  registerProvider,
  loginProvider,
  forgotPassword,
  resetPassword
};