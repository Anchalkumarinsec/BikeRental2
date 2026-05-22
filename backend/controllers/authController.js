const User = require('../models/User');
const jwt = require('jsonwebtoken');
const sendEmail = require('../utils/sendEmail');

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// Generate 6 digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please add all fields' });
    }

    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const assignedRole = (role === 'lender' || role === 'user' || role === 'admin' || role === 'delivery_agent') ? role : 'user';

    const salt = await require('bcryptjs').genSalt(10);
    const hashedPassword = await require('bcryptjs').hash(password, salt);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: assignedRole,
    });

    if (user) {
      // Instead of sending the token immediately, we can force them to login to get OTP
      // Or we can generate OTP right away. For simplicity, we just return success and ask them to login.
      res.status(201).json({
        message: 'Registration successful. Please login to receive your OTP.',
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    console.error("Login catch error:", error);
    res.status(500).json({ message: error.message, stack: error.stack });
  }
};

// @desc    Authenticate a user & send OTP
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
      console.log('PASSWORD MATCHED');
      // Generate OTP
      const otp = generateOTP();
      const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      user.otp = otp;
      user.otpExpires = otpExpires;
      console.log('ABOUT TO SAVE USER');
      await user.save();
      console.log('USER SAVED');

      // Send Email
      const message = `Your BikeRentLelo verification code is: ${otp}\nThis code is valid for 10 minutes.`;

      try {
        console.log('ABOUT TO SEND EMAIL');
        await sendEmail({
          email: user.email,
          subject: 'BikeRentLelo - Your Verification Code',
          message,
        });
        console.log('EMAIL SENT SUCCESSFULLY');

        return res.status(200).json({ message: 'OTP sent to email', email: user.email });
      } catch (err) {
        user.otp = undefined;
        user.otpExpires = undefined;
        await user.save();
        console.error("Email sending error:", err);
        return res.status(500).json({ message: 'Email could not be sent' });
      }
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Verify OTP & Issue JWT
// @route   POST /api/auth/verify-otp
// @access  Public
const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: 'Please provide email and OTP' });
    }

    const user = await User.findOne({
      email,
      otp,
      otpExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    // Clear OTP fields
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    res.json({
      _id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
  verifyOtp,
};
