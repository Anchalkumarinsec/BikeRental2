const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { protect } = require('../middleware/authMiddleware');
const User = require('../models/User');

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// @route   POST /api/wallet/add-funds
// @desc    Create Razorpay order to add funds
// @access  Private
router.post('/add-funds', protect, async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }

    const options = {
      amount: amount * 100, // amount in smallest currency unit (paise)
      currency: 'INR',
      receipt: `rcpt_${Date.now().toString().slice(-6)}_${req.user._id.toString().slice(-6)}`,
    };

    const order = await razorpay.orders.create(options);

    if (!order) {
      return res.status(500).json({ message: 'Some error occurred while creating order' });
    }

    res.json(order);
  } catch (error) {
    console.error('Razorpay Error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// @route   POST /api/wallet/verify-payment
// @desc    Verify Razorpay payment and add funds to wallet
// @access  Private
router.post('/verify-payment', protect, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount } = req.body;

    const sign = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest('hex');

    if (razorpay_signature === expectedSign) {
      // Payment is verified
      const user = await User.findById(req.user.id);
      if (!user) {
         return res.status(404).json({ message: 'User not found' });
      }

      // Add to wallet
      user.walletBalance = (user.walletBalance || 0) + Number(amount);
      await user.save();

      res.status(200).json({ message: 'Payment verified successfully', walletBalance: user.walletBalance });
    } else {
      res.status(400).json({ message: 'Invalid signature sent!' });
    }
  } catch (error) {
    console.error('Verify Payment Error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// @route   POST /api/wallet/withdraw
// @desc    Withdraw funds from wallet (Simulation)
// @access  Private
router.post('/withdraw', protect, async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if ((user.walletBalance || 0) < amount) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    // Deduct from wallet
    user.walletBalance -= Number(amount);
    await user.save();

    res.status(200).json({ message: 'Withdrawal successful', walletBalance: user.walletBalance });
  } catch (error) {
    console.error('Withdraw Error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
