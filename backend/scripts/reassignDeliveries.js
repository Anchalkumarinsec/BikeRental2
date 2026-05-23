require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const User = require('../models/User');
const Booking = require('../models/Booking');

const reassignDeliveries = async () => {
  try {
    console.log('Connecting to MongoDB...', process.env.MONGO_URI);
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected.');

    // Find the user's actual account
    const myAgent = await User.findOne({ email: 'ansarymdaman@gmail.com' });
    if (!myAgent) {
      console.log('Could not find user ansarymdaman@gmail.com');
      process.exit(1);
    }

    console.log('Found your agent account:', myAgent.email, 'ID:', myAgent._id);

    // Update all deliveries to be assigned to this user
    const result = await Booking.updateMany(
      { deliveryOption: 'delivery' },
      { $set: { assignedDeliveryAgent: myAgent._id } }
    );

    console.log(`Reassigned ${result.modifiedCount} deliveries to your account!`);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

reassignDeliveries();
