const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const Booking = require('../models/Booking');
const User = require('../models/User');
const sendNotification = require('../utils/notify');

// Middleware to check if user is admin or delivery agent
const deliveryAgentOrAdmin = (req, res, next) => {
  if (req.user && (req.user.role === 'delivery_agent' || req.user.role === 'admin')) {
    next();
  } else {
    res.status(401).json({ message: 'Not authorized as a delivery agent or admin' });
  }
};

const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(401).json({ message: 'Not authorized as an admin' });
  }
};

// @route   GET /api/delivery/all
// @desc    Get all deliveries (Admin)
// @access  Private/Admin
router.get('/all', protect, admin, async (req, res) => {
  try {
    const deliveries = await Booking.find({ deliveryOption: 'delivery' })
      .populate('vehicle', 'name imageUrl type')
      .populate('user', 'name phone email')
      .populate('assignedDeliveryAgent', 'name phone')
      .sort({ createdAt: -1 });
    res.json(deliveries);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error fetching deliveries' });
  }
});

// @route   GET /api/delivery/me
// @desc    Get assigned deliveries for logged in agent
// @access  Private/DeliveryAgent
router.get('/me', protect, deliveryAgentOrAdmin, async (req, res) => {
  try {
    const deliveries = await Booking.find({ 
      deliveryOption: 'delivery',
      assignedDeliveryAgent: req.user._id 
    })
      .populate('vehicle', 'name imageUrl type')
      .populate('user', 'name phone email')
      .sort({ createdAt: -1 });
    res.json(deliveries);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error fetching assigned deliveries' });
  }
});

// @route   GET /api/delivery/agents
// @desc    Get all delivery agents (Admin)
// @access  Private/Admin
router.get('/agents', protect, admin, async (req, res) => {
  try {
    const agents = await User.find({ role: 'delivery_agent' }).select('-password');
    res.json(agents);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error fetching agents' });
  }
});

// @route   PUT /api/delivery/:id/assign
// @desc    Assign a delivery agent to a booking (Admin)
// @access  Private/Admin
router.put('/:id/assign', protect, admin, async (req, res) => {
  try {
    const { agentId } = req.body;
    const booking = await Booking.findById(req.params.id);

    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.deliveryOption !== 'delivery') return res.status(400).json({ message: 'Not a delivery booking' });

    booking.assignedDeliveryAgent = agentId;
    booking.deliveryStatus = 'assigned';
    await booking.save();

    // Notify agent
    await sendNotification(req.app, {
      recipient: agentId,
      type: 'delivery',
      title: 'New Delivery Assigned',
      content: `You have been assigned a new delivery.`,
      link: '/dashboard/delivery-agent'
    });

    res.json({ message: 'Agent assigned successfully', booking });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error assigning agent' });
  }
});

// @route   PUT /api/delivery/:id/status
// @desc    Update delivery status
// @access  Private/DeliveryAgent or Admin
router.put('/:id/status', protect, deliveryAgentOrAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const booking = await Booking.findById(req.params.id).populate('vehicle');

    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    
    // Only assigned agent or admin can update
    if (req.user.role !== 'admin' && booking.assignedDeliveryAgent?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this delivery' });
    }

    booking.deliveryStatus = status;
    const updatedBooking = await booking.save();

    // Notify user
    const io = req.app.get('io');
    if (io) {
      io.to(`user-${booking.user}`).emit('delivery-update', {
        bookingId: booking._id,
        status: status,
        message: `Your delivery status has been updated to: ${status.replace('_', ' ')}`
      });
    }

    await sendNotification(req.app, {
      recipient: booking.user,
      type: 'delivery',
      title: 'Delivery Update',
      content: `Your delivery status is now: ${status.replace('_', ' ')}`,
      link: '/dashboard/user'
    });

    res.json(updatedBooking);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error updating delivery status' });
  }
});

module.exports = router;
