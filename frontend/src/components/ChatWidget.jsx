import { useState, useEffect, useRef } from 'react';
import { X, Send, MessageCircle } from 'lucide-react';
import io from 'socket.io-client';
import axios from 'axios';
import { useNotification } from '../contexts/NotificationContext';

const ChatWidget = ({ recipientId, recipientName = 'Lender', vehicle = null, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef(null);

  const { socket } = useNotification();

  const userStr = localStorage.getItem('user');
  const userObj = userStr ? JSON.parse(userStr) : null;
  const currentUserId = userObj ? (userObj._id || userObj.id) : null;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (!socket) return;

    // Listen for incoming messages
    socket.on('receive-message', (message) => {
      if (message.sender === recipientId || message.receiver === recipientId) {
        setMessages((prev) => [...prev, message]);
      }
    });

    // Listen for message confirmation (self sent)
    socket.on('message-sent', (message) => {
      setMessages((prev) => [...prev, message]);
    });

    // Fetch message history
    const fetchMessages = async () => {
      try {
        const token = localStorage.getItem('token');
        const config = {
          headers: { Authorization: `Bearer ${token}` }
        };
        const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/messages/conversation/${recipientId}`, config);
        setMessages(res.data);
      } catch (error) {
        console.error('Failed to fetch messages:', error);
      }
    };

    fetchMessages();

    return () => {
      socket.off('receive-message');
      socket.off('message-sent');
    };
  }, [recipientId, socket]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    if (!currentUserId) {
      alert("User ID not found. Please log in again.");
      return;
    }

    if (!socket) {
      alert("Chat connection not ready. Please wait.");
      return;
    }

    const actualRecipientId = typeof recipientId === 'object' ? recipientId._id : recipientId;

    const messageData = {
      senderId: currentUserId,
      receiverId: actualRecipientId,
      content: inputMessage,
    };
    
    if (vehicle?._id) {
      messageData.vehicleId = vehicle._id;
    }

    socket.emit('send-message', messageData);
    setInputMessage('');
  };

  return (
    <div className="fixed bottom-24 right-6 w-80 h-96 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col z-50 overflow-hidden">
      {/* Header */}
      <div className="bg-orange-500 text-white p-4 flex flex-col shrink-0">
        <div className="flex justify-between items-center mb-1">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            <h3 className="font-bold">Chat with {recipientName}</h3>
          </div>
          <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        {vehicle && (
          <div className="text-xs text-orange-100 flex items-center gap-2 mt-1">
            {vehicle.imageUrl ? (
              <img src={vehicle.imageUrl} alt="vehicle" className="w-6 h-6 object-cover rounded" />
            ) : (
              <div className="w-6 h-6 flex items-center justify-center bg-white/20 rounded text-xs">🛵</div>
            )}
            <span>Inquiring about: {vehicle.name}</span>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 p-4 overflow-y-auto bg-zinc-50 dark:bg-zinc-950 space-y-3">
        {messages.length === 0 ? (
          <p className="text-center text-slate-500 dark:text-zinc-500 text-sm mt-10">Say hello!</p>
        ) : (
          messages.map((msg, idx) => {
            const isMe = msg.sender === currentUserId;
            return (
              <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] p-3 rounded-2xl text-sm flex flex-col gap-1 ${isMe ? 'bg-orange-500 text-white rounded-br-none' : 'bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-slate-900 dark:text-white rounded-bl-none'}`}>
                  {msg.vehicle && msg.vehicle.name && (
                    <div className={`flex items-center gap-2 p-2 mb-1 rounded-xl border ${isMe ? 'bg-white/20 border-white/20 text-white' : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-100 dark:border-zinc-700'}`}>
                      {msg.vehicle.imageUrl ? (
                        <img src={msg.vehicle.imageUrl} alt="vehicle" className="w-8 h-8 rounded object-cover" />
                      ) : (
                        <div className={`w-8 h-8 flex items-center justify-center rounded text-sm ${isMe ? 'bg-white/20' : 'bg-zinc-200 dark:bg-zinc-800'}`}>🛵</div>
                      )}
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-black opacity-70 tracking-wider">Inquiring about</span>
                        <span className="font-bold text-xs">{msg.vehicle.name}</span>
                      </div>
                    </div>
                  )}
                  <span>{msg.content}</span>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSendMessage} className="p-3 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 shrink-0 flex gap-2">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 bg-zinc-100 dark:bg-zinc-800 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-900 dark:text-white"
        />
        <button type="submit" disabled={!inputMessage.trim()} className="bg-orange-500 text-white p-2 rounded-full hover:bg-orange-600 disabled:opacity-50 transition-colors">
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};

export default ChatWidget;
