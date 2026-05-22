import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Bike } from 'lucide-react';

const Register = () => {
  const [searchParams] = useSearchParams();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user'
  });

  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const roleParam = searchParams.get('role');
    if (roleParam === 'lender') {
      setFormData(prev => ({ ...prev, role: 'lender' }));
    }
  }, [searchParams]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/register`, formData);
      
      // Redirect to login to start OTP flow
      alert(response.data.message);
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center pt-32 pb-12 px-4 sm:px-6 lg:px-8 selection:bg-orange-100 selection:text-orange-900 transition-colors duration-300">
      <div className="max-w-md w-full bg-white dark:bg-zinc-900 p-10 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm transition-colors duration-300">
        <div className="text-center mb-10">
          <div className="bg-zinc-50 dark:bg-zinc-800 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-zinc-100 dark:border-zinc-700 shadow-sm transition-colors duration-300">
            <Bike className="h-8 w-8 text-orange-500" />
          </div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Create Account</h2>
          <p className="mt-3 text-sm font-medium text-slate-500 dark:text-zinc-400">
            Join BikeRentLelo today
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl text-sm font-medium">
            {error}
          </div>
        )}
        
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300 mb-2">Full Name</label>
            <input
              name="name"
              type="text"
              required
              className="block w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:bg-white dark:focus:bg-zinc-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
              onChange={handleChange}
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300 mb-2">Email address</label>
            <input
              name="email"
              type="email"
              required
              className="block w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:bg-white dark:focus:bg-zinc-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
              onChange={handleChange}
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300 mb-2">Password</label>
            <input
              name="password"
              type="password"
              required
              className="block w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:bg-white dark:focus:bg-zinc-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
              onChange={handleChange}
            />
          </div>
          
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300 mb-2">I want to</label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="block w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:bg-white dark:focus:bg-zinc-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
            >
              <option value="user">Rent Vehicles (User)</option>
              <option value="lender">List My Vehicles (Lender)</option>
              <option value="delivery_agent">Work as Delivery Agent</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-4 px-4 border border-transparent rounded-full shadow-sm text-sm font-bold text-white dark:text-slate-900 bg-slate-900 dark:bg-white hover:bg-orange-500 dark:hover:bg-orange-500 dark:hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 transition-colors mt-8"
          >
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-sm font-medium text-slate-500 dark:text-zinc-400">
            Already have an account?{' '}
            <Link to="/login" className="font-bold text-slate-900 dark:text-white hover:text-orange-500 dark:hover:text-orange-500 transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
