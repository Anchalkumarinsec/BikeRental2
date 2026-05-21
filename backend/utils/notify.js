const Notification = require('../models/Notification');

/**
 * Creates a notification in DB and emits it via socket.io
 * 
 * @param {Object} app - Express app instance (to get io)
 * @param {Object} params - Notification parameters
 * @param {String} params.recipient - User ID of recipient
 * @param {String} params.type - 'message', 'booking', 'payment', 'system'
 * @param {String} params.title - Title of notification
 * @param {String} params.content - Message content
 * @param {String} params.link - Optional URL to redirect
 */
const sendNotification = async (app, { recipient, type, title, content, link }) => {
  try {
    const notification = await Notification.create({
      recipient,
      type,
      title,
      content,
      link
    });

    const io = app.get('io');
    if (io) {
      io.to(`user-${recipient}`).emit('new-notification', notification);
    }

    return notification;
  } catch (error) {
    console.error('Error sending notification:', error);
  }
};

module.exports = sendNotification;
