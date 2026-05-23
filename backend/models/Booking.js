const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
  },
  vehicle: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Vehicle',
  },
  startDate: {
    type: Date,
    required: true,
  },
  durationHours: {
    type: Number,
    required: true,
  },
  totalAmount: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'completed', 'cancelled'],
    default: 'pending'
  },
  deliveryOption: {
    type: String,
    enum: ['self_pickup', 'delivery'],
    default: 'self_pickup'
  },
  deliveryAddress: {
    type: String
  },
  deliveryCoordinates: {
    lat: Number,
    lng: Number
  },
  deliveryCharge: {
    type: Number,
    default: 0
  },
  deliveryStatus: {
    type: String,
    enum: ['pending', 'assigned', 'out_for_delivery', 'delivered', 'pickup_scheduled', 'picked_up', 'completed'],
    default: 'pending'
  },
  assignedDeliveryAgent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  deliveryDate: {
    type: Date
  },
  pickupDate: {
    type: Date
  },
  razorpayOrderId: {
    type: String,
  },
  razorpayPaymentId: {
    type: String,
  },
  // Last known GPS position of rider (updated every few seconds during ride)
  lastKnownLocation: {
    lat: Number,
    lng: Number
  },
  // Full route history stored during the ride for replay
  routeHistory: [{
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    speed: { type: Number, default: 0 }, // km/h
    timestamp: { type: Date, default: Date.now }
  }],
  // Total distance ridden in km (calculated at ride end)
  rideDistanceKm: {
    type: Number,
    default: 0
  },
  // Agents who clicked 'reject' on this delivery so it doesn't show in their available feed
  rejectedByDeliveryAgents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, { timestamps: true });

const Booking = mongoose.model('Booking', bookingSchema);
module.exports = Booking;
