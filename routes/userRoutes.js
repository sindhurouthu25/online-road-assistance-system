const express = require('express');
const router = express.Router();
const{
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
} = require('../controllers/userController');

const {protect} = require('../middleware/authMiddleware');

router.get('/dashboard', protect, getUserDashboard);
router.get('/profile',protect, getUserProfile);
router.put('/profile',protect, updateUserProfile);
router.delete('/account',protect, deleteAccount);
router.post('/vehicles',protect, addVehicle);
router.get('/vehicles',protect, getUserVehicles);
router.put('/vehicles/:id',protect, updateVehicle);
router.delete('/vehicles/:id',protect, deleteVehicle);
router.get('/notifications',protect, getNotifications);
router.put('/notifications/read',protect, markNotificationsRead);

module.exports = router;