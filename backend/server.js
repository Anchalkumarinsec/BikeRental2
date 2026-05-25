require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const connectDB = require('./config/db');
const Message = require('./models/Message');

const app = express();
const server = http.createServer(app);

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Make io accessible in routes
app.set('io', io);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/vehicles', require('./routes/vehicleRoutes'));
app.use('/api/bookings', require('./routes/bookingRoutes'));
app.use('/api/ai', require('./routes/aiRoutes'));
app.use('/api/messages', require('./routes/messageRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/delivery', require('./routes/deliveryRoutes'));
app.use('/api/wallet', require('./routes/walletRoutes'));

// Serve static files
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/', (req, res) => {
  res.send('BikeRentLelo API is running...');
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // Rider joins a room specific to their booking
  socket.on('join-booking-room', (bookingId) => {
    socket.join(`booking-${bookingId}`);
    console.log(`Socket ${socket.id} joined room booking-${bookingId}`);
  });

  // User/Lender joins their personal notification room
  socket.on('join-user-room', (userId) => {
    socket.join(`user-${userId}`);
    console.log(`Socket ${socket.id} joined user room user-${userId}`);
  });

  // Rider broadcasts their live location — server relays to everyone in the room
  socket.on('rider-location', ({ bookingId, lat, lng, speed }) => {
    socket.to(`booking-${bookingId}`).emit('location-update', { lat, lng, speed });
  });

  // Chat messaging
  socket.on('send-message', async (data) => {
    console.log('Received send-message on backend:', data);
    try {
      const { senderId, receiverId, content, vehicleId } = data;
      
      const messagePayload = {
        sender: senderId,
        receiver: receiverId,
        content
      };
      if (vehicleId) messagePayload.vehicle = vehicleId;

      // Save message to DB
      let newMessage = await Message.create(messagePayload);
      
      if (vehicleId) {
        newMessage = await newMessage.populate('vehicle', 'name imageUrl');
      }

      // Emit to receiver's room
      socket.to(`user-${receiverId}`).emit('receive-message', newMessage);
      
      // Also emit back to sender so their UI updates
      socket.emit('message-sent', newMessage);

      // Create notification for receiver
      const Notification = require('./models/Notification');
      const senderObj = await require('./models/User').findById(senderId).select('name role');
      const senderRole = senderObj?.role === 'lender' ? 'Lender' : 'User';
      const senderName = senderObj ? senderObj.name : 'Someone';
      
      let notifTitle = `Message from ${senderRole} (${senderName})`;
      let notifContent = content.substring(0, 50) + (content.length > 50 ? '...' : '');

      if (vehicleId) {
        const Vehicle = require('./models/Vehicle');
        const vehicleObj = await Vehicle.findById(vehicleId).select('name');
        if (vehicleObj) {
          notifContent = `Regarding: ${vehicleObj.name} - "${notifContent}"`;
        }
      }
      
      const notification = await Notification.create({
        recipient: receiverId,
        type: 'message',
        title: notifTitle,
        content: notifContent,
        link: `/dashboard`
      });
      
      socket.to(`user-${receiverId}`).emit('new-notification', notification);

    } catch (error) {
      console.error('Socket error saving message:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT} with Socket.IO`);
  });
});
