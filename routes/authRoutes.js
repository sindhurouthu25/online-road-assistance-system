const express = require('express');
const router = express.Router();
const{
    registerUser,
    loginUser,
    registerProvider,
    loginProvider,
    forgotPassword,
    resetPassword
} = require('../controllers/authController');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/register-provider', registerProvider);
router.post('/login-provider', loginProvider);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

module.exports = router;