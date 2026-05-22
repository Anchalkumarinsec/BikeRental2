import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Moon, Sun } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import NotificationBell from './NotificationBell';

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  // Check if we are on a dashboard route
  const isDashboard = location.pathname.startsWith('/dashboard');

  // Basic check for logged in user
  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : null;

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <nav className="fixed w-full bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md z-50 border-b border-zinc-100 dark:border-zinc-800 transition-colors duration-300">
      <div className="container mx-auto px-6 h-20 flex items-center justify-between">
        <Link to="/" className="flex items-center space-x-2">
          <span className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">BikeRent<span className="text-orange-500">Lelo</span></span>
        </Link>
        
        {user ? (
          <div className="hidden md:flex items-center space-x-8 text-sm font-semibold text-slate-500 dark:text-zinc-400">
            <Link to="/" className="hover:text-slate-900 dark:hover:text-white transition-colors">Home</Link>
            <Link to="/vehicles" className="hover:text-slate-900 dark:hover:text-white transition-colors">Find Vehicles</Link>
            <Link to={user.role === 'delivery_agent' ? '/dashboard/delivery-agent' : `/dashboard/${user.role || 'user'}`} className="hover:text-slate-900 dark:hover:text-white transition-colors">My Dashboard</Link>
          </div>
        ) : (
          !isDashboard && (
            <div className="hidden md:flex items-center space-x-8 text-sm font-semibold text-slate-500 dark:text-zinc-400">
              <Link to="/" className="hover:text-slate-900 dark:hover:text-white transition-colors">Home</Link>
              <Link to="/#rentals" className="hover:text-slate-900 dark:hover:text-white transition-colors">Rentals</Link>
              <Link to="/#about" className="hover:text-slate-900 dark:hover:text-white transition-colors">About</Link>
            </div>
          )
        )}

        <div className="flex items-center space-x-6">
          <button 
            onClick={toggleTheme} 
            className="p-2 rounded-full bg-zinc-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 hover:text-orange-500 dark:hover:text-orange-500 transition-colors"
            aria-label="Toggle Dark Mode"
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          {user ? (
            <div className="flex items-center space-x-4">
              <NotificationBell />
              <button 
                onClick={handleLogout}
                className="flex items-center space-x-2 text-sm font-bold text-slate-500 dark:text-zinc-400 hover:text-red-500 dark:hover:text-red-500 transition-colors"
              >
                <LogOut size={18} />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <div className="hidden sm:flex items-center space-x-4">
              <Link to="/login" className="text-sm font-bold text-slate-900 dark:text-white hover:text-orange-500 dark:hover:text-orange-500 transition-colors">Log In</Link>
              <Link to="/register" className="text-sm font-bold bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-5 py-2.5 rounded-full hover:bg-orange-500 dark:hover:bg-orange-500 dark:hover:text-white transition-colors shadow-sm">
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
