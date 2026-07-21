const express = require('express');
const router = express.Router();
const{
    createServiceRequest,
    getUserRequests,
    getRequestById,
    acceptRequest,
    startService,
    completeService,
    cancelRequest,
    getPendingRequests
} = require('../controllers/serviceController');
const {protect} = require('../middleware/authMiddleware');
router.post('/request', protect, createServiceRequest);
router.get('/my-requests',protect, getUserRequests);
router.get('/pending',protect, getPendingRequests);
router.get('/:id',protect, getRequestById);
router.put('/:id/accept',protect, acceptRequest);
router.put('/:id/start', protect, startService);
router.put('/:id/complete',protect, completeService);
router.put('/:id/cancel',protect, cancelRequest);

module.exports = router;