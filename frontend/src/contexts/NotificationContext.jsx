import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { X, Bell } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

const NotificationContext = createContext();

export const useNotification = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toast, setToast] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  const [socket, setSocket] = useState(null);
  const [currentUserStr, setCurrentUserStr] = useState(localStorage.getItem('user'));

  const fetchNotifications = async () => {
    try {
      const userStr = localStorage.getItem('user');
      const token = localStorage.getItem('token');
      if (!userStr || !token) return;

      const { data } = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.isRead).length);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  // Track login/logout via location changes
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr !== currentUserStr) {
      setCurrentUserStr(userStr);
    }
  }, [location.pathname]);

  useEffect(() => {
    if (!currentUserStr) {
      setSocket(null);
      return;
    }

    fetchNotifications();

    const userObj = JSON.parse(currentUserStr);
    const newSocket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
      transports: ['websocket'],
      upgrade: false
    });
    setSocket(newSocket);
    newSocket.emit('join-user-room', userObj._id || userObj.id);

    newSocket.on('new-notification', (notif) => {
      setNotifications((prev) => [notif, ...prev]);
      setUnreadCount((prev) => prev + 1);
      
      // Show Toast
      setToast(notif);
      setTimeout(() => setToast(null), 5000);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [currentUserStr]);

  const markAsRead = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/notifications/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications((prev) => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/notifications/read-all`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications((prev) => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const handleToastClick = () => {
    if (toast) {
      markAsRead(toast._id);
      if (toast.link) navigate(toast.link);
      setToast(null);
    }
  };

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, markAllAsRead, socket }}>
      {children}
      {/* Global Toast */}
      {toast && (
        <div 
          onClick={handleToastClick}
          className="fixed top-24 right-6 z-[100] w-80 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-4 flex gap-4 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-all animate-in slide-in-from-top-4 fade-in duration-300"
        >
          <div className="bg-orange-100 dark:bg-orange-500/20 text-orange-500 rounded-full p-2 h-fit shrink-0">
            <Bell className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">{toast.title}</h4>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 line-clamp-2">{toast.content}</p>
          </div>
          <button 
            onClick={(e) => { e.stopPropagation(); setToast(null); }} 
            className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 h-fit"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </NotificationContext.Provider>
  );
};
