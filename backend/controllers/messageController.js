const Message = require('../models/Message');
const User = require('../models/User');

// @desc    Get conversation between current user and another user
// @route   GET /api/messages/conversation/:userId
// @access  Private
const getConversation = async (req, res) => {
  try {
    const userId1 = req.user._id;
    const userId2 = req.params.userId;

    const messages = await Message.find({
      $or: [
        { sender: userId1, receiver: userId2 },
        { sender: userId2, receiver: userId1 }
      ]
    }).sort({ createdAt: 1 }).populate('vehicle', 'name imageUrl');

    res.json(messages);
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get inbox list (unique users chatted with)
// @route   GET /api/messages/inbox
// @access  Private
const getInbox = async (req, res) => {
  try {
    const userId = req.user._id;

    // Find all messages involving this user
    const messages = await Message.find({
      $or: [{ sender: userId }, { receiver: userId }]
    }).sort({ createdAt: -1 }).populate('vehicle', 'name imageUrl');

    // Extract unique user IDs and keep the latest message for each
    const contactsMap = new Map();
    
    messages.forEach((msg) => {
      const otherUserId = msg.sender.toString() === userId.toString() 
        ? msg.receiver.toString() 
        : msg.sender.toString();
        
      if (!contactsMap.has(otherUserId)) {
        contactsMap.set(otherUserId, msg);
      }
    });

    const contactIds = Array.from(contactsMap.keys());
    const users = await User.find({ _id: { $in: contactIds } }).select('name email role');

    const inbox = users.map(user => {
      return {
        user,
        latestMessage: contactsMap.get(user._id.toString())
      };
    });

    // Sort inbox by latest message time
    inbox.sort((a, b) => new Date(b.latestMessage.createdAt) - new Date(a.latestMessage.createdAt));

    res.json(inbox);
  } catch (error) {
    console.error('Error fetching inbox:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Mark messages from a user as read
// @route   PUT /api/messages/read/:userId
// @access  Private
const markAsRead = async (req, res) => {
  try {
    const senderId = req.params.userId;
    const receiverId = req.user._id;

    await Message.updateMany(
      { sender: senderId, receiver: receiverId, read: false },
      { $set: { read: true } }
    );

    res.json({ message: 'Messages marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getConversation,
  getInbox,
  markAsRead
};
