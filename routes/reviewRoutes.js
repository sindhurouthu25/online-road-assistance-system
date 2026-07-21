const express = require('express');
const router = express.Router();
const{
    createReview,
    getProviderReviews,
    getMyReviews,
    replyToReview,
    markHelpful,
    deleteReview
} = require('../controllers/reviewController');
const {protect} = 
require('../middleware/authMiddleware');
router.post('/',protect, createReview);
router.get('/my-reviews',protect, getMyReviews);
router.get('/provider/:id', getProviderReviews);
router.put('/:id/reply',protect,replyToReview);
router.put('/:id/helpful',protect, markHelpful);
router.delete('/:id',protect, deleteReview);

module.exports = router;