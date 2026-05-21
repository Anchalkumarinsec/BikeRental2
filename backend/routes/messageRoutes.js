const express = require('express');
const router = express.Router();
const { getConversation, getInbox, markAsRead } = require('../controllers/messageController');
const { protect } = require('../middleware/authMiddleware');

router.get('/inbox', protect, getInbox);
router.get('/conversation/:userId', protect, getConversation);
router.put('/read/:userId', protect, markAsRead);

module.exports = router;
