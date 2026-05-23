require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const Booking = require('../models/Booking');

const seedDeliveries = async () => {
  try {
    console.log('Connecting to MongoDB...', process.env.MONGO_URI);
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected.');

    // Find or create Delivery Agent
    let agent = await User.findOne({ role: 'delivery_agent' });
    if (!agent) {
      const bcrypt = require('bcryptjs');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('123456', salt);
      agent = await User.create({
        name: 'Speedy Delivery',
        email: 'agent@bikerentlelo.com',
        password: hashedPassword,
        role: 'delivery_agent',
        phone: '9876543210',
        kycStatus: 'verified'
      });
      console.log('Created Delivery Agent:', agent.email);
    }

    // Find or create a normal user (Customer)
    let customer = await User.findOne({ role: 'user' });
    if (!customer) {
      const bcrypt = require('bcryptjs');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('123456', salt);
      customer = await User.create({
        name: 'John Doe',
        email: 'customer@bikerentlelo.com',
        password: hashedPassword,
        role: 'user',
        phone: '9998887776',
        kycStatus: 'verified'
      });
    }

    // Find or create a Lender
    let lender = await User.findOne({ role: 'lender' });
    if (!lender) {
      const bcrypt = require('bcryptjs');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('123456', salt);
      lender = await User.create({
        name: 'City Rentals',
        email: 'lender@bikerentlelo.com',
        password: hashedPassword,
        role: 'lender',
        kycStatus: 'verified'
      });
    }

    // Create Vehicles
    await Vehicle.deleteMany({ name: { $in: ['Ola S1 Pro Demo', 'Ather 450X Demo', 'TVS iQube Demo'] } });
    
    const vehicles = await Vehicle.insertMany([
      {
        name: 'Ola S1 Pro Demo',
        type: 'Electric Scooter',
        brand: 'Ola',
        pricePerHour: 150,
        pricePerDay: 800,
        range: '135 km',
        location: 'Connaught Place',
        vendorId: lender._id,
        imageUrl: '/placeholder.jpg' // Dummy
      },
      {
        name: 'Ather 450X Demo',
        type: 'Electric Scooter',
        brand: 'Ather',
        pricePerHour: 180,
        pricePerDay: 900,
        range: '105 km',
        location: 'Saket',
        vendorId: lender._id,
        imageUrl: '/placeholder.jpg'
      },
      {
        name: 'TVS iQube Demo',
        type: 'Electric Scooter',
        brand: 'TVS',
        pricePerHour: 120,
        pricePerDay: 700,
        range: '100 km',
        location: 'Dwarka',
        vendorId: lender._id,
        imageUrl: '/placeholder.jpg'
      }
    ]);

    // Create Bookings assigned to agent
    // To not clutter with thousands of runs, we might clear previous demo bookings
    await Booking.deleteMany({ assignedDeliveryAgent: agent._id });

    await Booking.create([
      {
        user: customer._id,
        vehicle: vehicles[0]._id,
        startDate: new Date(Date.now() + 86400000), // tomorrow
        durationHours: 24,
        totalAmount: 950,
        status: 'confirmed',
        deliveryOption: 'delivery',
        deliveryAddress: 'Sector 21, Dwarka, New Delhi',
        deliveryCoordinates: { lat: 28.5823, lng: 77.0500 },
        deliveryCharge: 150,
        deliveryStatus: 'assigned',
        assignedDeliveryAgent: agent._id,
        deliveryDate: new Date(Date.now() + 80000000),
        pickupDate: new Date(Date.now() + 166400000)
      },
      {
        user: customer._id,
        vehicle: vehicles[1]._id,
        startDate: new Date(),
        durationHours: 4,
        totalAmount: 820,
        status: 'confirmed',
        deliveryOption: 'delivery',
        deliveryAddress: 'South Ex Part 1, New Delhi',
        deliveryCoordinates: { lat: 28.5670, lng: 77.2215 },
        deliveryCharge: 100,
        deliveryStatus: 'out_for_delivery',
        assignedDeliveryAgent: agent._id,
        deliveryDate: new Date(),
        pickupDate: new Date(Date.now() + 14400000)
      },
      {
        user: customer._id,
        vehicle: vehicles[2]._id,
        startDate: new Date(Date.now() - 172800000), // 2 days ago
        durationHours: 48,
        totalAmount: 1600,
        status: 'completed',
        deliveryOption: 'delivery',
        deliveryAddress: 'Rajiv Chowk, New Delhi',
        deliveryCoordinates: { lat: 28.6329, lng: 77.2195 },
        deliveryCharge: 200,
        deliveryStatus: 'completed',
        assignedDeliveryAgent: agent._id,
        deliveryDate: new Date(Date.now() - 172800000),
        pickupDate: new Date()
      }
    ]);

    console.log('Demo Delivery Data Seeded Successfully!');
    process.exit();
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

seedDeliveries();
