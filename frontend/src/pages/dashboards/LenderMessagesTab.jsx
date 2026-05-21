import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { MessageCircle, Send } from 'lucide-react';
import { useNotification } from '../../contexts/NotificationContext';

const LenderMessagesTab = () => {
  const [inbox, setInbox] = useState([]);
  const [activeChatUser, setActiveChatUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const { socket } = useNotification();
  const messagesEndRef = useRef(null);

  const userString = localStorage.getItem('user');
  const currentUser = userString ? JSON.parse(userString) : null;

  useEffect(() => {
    fetchInbox();

    if (!socket || !currentUser?._id) return;

    const handleReceive = (message) => {
      setMessages((prev) => [...prev, message]);
      fetchInbox();
    };

    const handleSent = (message) => {
      setMessages((prev) => [...prev, message]);
      fetchInbox();
    };

    socket.on('receive-message', handleReceive);
    socket.on('message-sent', handleSent);

    return () => {
      socket.off('receive-message', handleReceive);
      socket.off('message-sent', handleSent);
    };
  }, [socket]);

  const fetchInbox = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/messages/inbox`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInbox(res.data);
    } catch (err) {
      console.error('Failed to fetch inbox:', err);
    }
  };

  const openChat = async (user) => {
    setActiveChatUser(user);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/messages/conversation/${user._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(res.data);
      
      // Mark as read
      await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/messages/read/${user._id}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {
      console.error('Failed to fetch conversation:', err);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || !activeChatUser) return;

    const userStr = localStorage.getItem('user');
    const userObj = userStr ? JSON.parse(userStr) : null;
    const currentUserId = userObj ? (userObj._id || userObj.id) : null;

    if (!currentUserId) {
      alert("User ID not found. Please log in again.");
      return;
    }

    if (!socket) {
      alert("Chat connection not ready.");
      return;
    }

    socket.emit('send-message', {
      senderId: currentUserId,
      receiverId: activeChatUser._id || activeChatUser,
      content: inputMessage,
    });
    setInputMessage('');
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden flex h-[600px]">
      
      {/* Inbox List (Left) */}
      <div className="w-1/3 border-r border-zinc-200 dark:border-zinc-800 flex flex-col bg-zinc-50 dark:bg-zinc-900/50">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
          <h2 className="font-black text-xl text-slate-900 dark:text-white flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-orange-500" /> Messages
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {inbox.length === 0 ? (
            <div className="p-8 text-center text-slate-500 font-medium">No messages yet.</div>
          ) : (
            inbox.map((item, idx) => (
              <button
                key={idx}
                onClick={() => openChat(item.user)}
                className={`w-full text-left p-4 border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-white dark:hover:bg-zinc-800 transition-colors ${activeChatUser?._id === item.user._id ? 'bg-white dark:bg-zinc-800 border-l-4 border-l-orange-500' : ''}`}
              >
                <h4 className="font-bold text-slate-900 dark:text-white flex items-center justify-between">
                  {item.user.name}
                  {item.latestMessage?.vehicle && (
                    <span className="text-[10px] bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">
                      {item.latestMessage.vehicle.name}
                    </span>
                  )}
                </h4>
                <p className="text-sm text-slate-500 dark:text-zinc-400 truncate mt-1">
                  {item.latestMessage?.content}
                </p>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat Area (Right) */}
      <div className="flex-1 flex flex-col bg-white dark:bg-zinc-950">
        {activeChatUser ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">{activeChatUser.name}</h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 capitalize">{activeChatUser.role || 'User'}</p>
              </div>
              
              {/* Optional Vehicle Context */}
              {messages.find(m => m.vehicle)?.vehicle && (
                <div className="flex items-center gap-3 bg-zinc-50 dark:bg-zinc-800/50 px-3 py-1.5 rounded-xl border border-zinc-100 dark:border-zinc-800">
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-orange-500 uppercase tracking-wider">Inquiring about</p>
                    <p className="text-xs font-semibold text-slate-900 dark:text-white">
                      {messages.find(m => m.vehicle).vehicle.name}
                    </p>
                  </div>
                  {messages.find(m => m.vehicle).vehicle.imageUrl ? (
                    <img 
                      src={messages.find(m => m.vehicle).vehicle.imageUrl} 
                      alt="vehicle" 
                      className="w-10 h-10 object-cover rounded-lg shadow-sm"
                    />
                  ) : (
                    <div className="w-10 h-10 flex items-center justify-center bg-white dark:bg-zinc-800 rounded-lg shadow-sm text-xl border border-zinc-200 dark:border-zinc-700">🛵</div>
                  )}
                </div>
              )}
            </div>
            
            {/* Messages List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, idx) => {
                const isMe = msg.sender === currentUser._id;
                return (
                  <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] p-3 rounded-2xl text-sm ${isMe ? 'bg-orange-500 text-white rounded-br-none' : 'bg-zinc-100 dark:bg-zinc-800 text-slate-900 dark:text-white rounded-bl-none border border-zinc-200 dark:border-zinc-700'}`}>
                      {msg.vehicle && msg.vehicle.name && (
                        <div className={`flex items-center gap-2 mb-2 p-2 rounded-xl border ${isMe ? 'bg-white/20 border-white/20 text-white' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700'}`}>
                          {msg.vehicle.imageUrl ? (
                            <img src={msg.vehicle.imageUrl} alt="vehicle" className="w-8 h-8 rounded-lg object-cover" />
                          ) : (
                            <div className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm ${isMe ? 'bg-white/20' : 'bg-zinc-100 dark:bg-zinc-800'}`}>🛵</div>
                          )}
                          <div className="flex flex-col">
                            <span className="text-[10px] uppercase font-black opacity-70 tracking-wider">Inquiring about</span>
                            <span className="font-bold text-xs">{msg.vehicle.name}</span>
                          </div>
                        </div>
                      )}
                      {msg.content}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Box */}
            <form onSubmit={handleSendMessage} className="p-4 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 shrink-0 flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 bg-zinc-100 dark:bg-zinc-800 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-900 dark:text-white"
              />
              <button disabled={!inputMessage.trim()} type="submit" className="bg-orange-500 text-white p-3 rounded-full hover:bg-orange-600 disabled:opacity-50 transition-colors">
                <Send className="w-4 h-4" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 dark:text-zinc-500">
            <MessageCircle className="w-16 h-16 mb-4 opacity-50" />
            <p className="font-bold">Select a conversation to start chatting</p>
          </div>
        )}
      </div>

    </div>
  );
};

export default LenderMessagesTab;
