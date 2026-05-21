import { useState, useRef, useEffect } from 'react';
import { Bell, Check, CheckCircle2 } from 'lucide-react';
import { useNotification } from '../contexts/NotificationContext';
import { useNavigate } from 'react-router-dom';

const timeAgo = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.round((now - date) / 1000);
  const minutes = Math.round(seconds / 60);
  const hours = Math.round(minutes / 60);
  const days = Math.round(hours / 24);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
};

const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotification();
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = (notif) => {
    if (!notif.isRead) markAsRead(notif._id);
    
    let targetLink = notif.link;
    
    // If the backend sent a generic /dashboard link (e.g. for messages)
    if (targetLink === '/dashboard' || notif.type === 'message') {
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      if (user?.role === 'lender') {
        targetLink = '/dashboard/lender?tab=messages';
      } else {
        targetLink = '/dashboard/user?tab=messages';
      }
    }
    
    if (targetLink) navigate(targetLink);
    setIsOpen(false);
  };

  const getBadgeColor = (type) => {
    switch(type) {
      case 'message': return 'bg-blue-500';
      case 'booking': return 'bg-orange-500';
      case 'payment': return 'bg-green-500';
      default: return 'bg-zinc-500';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full bg-zinc-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 hover:text-orange-500 dark:hover:text-orange-500 transition-colors"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white dark:border-zinc-900">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 max-h-[28rem] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl z-50 flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          
          <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-950/50">
            <h3 className="font-bold text-slate-900 dark:text-white">Notifications</h3>
            {unreadCount > 0 && (
              <button 
                onClick={markAllAsRead}
                className="text-xs font-semibold text-orange-500 hover:text-orange-600 dark:hover:text-orange-400 flex items-center gap-1"
              >
                <CheckCircle2 className="w-3 h-3" /> Mark all read
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-sm font-medium text-slate-500 dark:text-zinc-500">
                You have no notifications yet.
              </div>
            ) : (
              notifications.map((notif) => (
                <button
                  key={notif._id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`w-full text-left p-4 border-b border-zinc-50 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors flex gap-3 relative ${!notif.isRead ? 'bg-orange-50/50 dark:bg-orange-500/5' : ''}`}
                >
                  {!notif.isRead && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-500"></div>
                  )}
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${getBadgeColor(notif.type)} ${notif.isRead ? 'opacity-40' : ''}`} />
                  <div className="flex-1">
                    <div className="flex justify-between items-start gap-2">
                      <p className={`text-sm ${!notif.isRead ? 'font-bold text-slate-900 dark:text-white' : 'font-medium text-slate-700 dark:text-zinc-300'}`}>
                        {notif.title}
                      </p>
                      <span className="text-[10px] text-slate-400 dark:text-zinc-500 shrink-0 whitespace-nowrap mt-0.5">
                        {timeAgo(notif.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 line-clamp-2 pr-4">
                      {notif.content}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
          
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
