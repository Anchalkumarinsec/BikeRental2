import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Bike } from 'lucide-react';

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (step === 1) {
      try {
        const response = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/login`, formData);
        setStep(2); // Move to OTP step
      } catch (err) {
        setError(err.response?.data?.message || 'Login failed. Invalid credentials.');
      } finally {
        setLoading(false);
      }
    } else {
      // Step 2: Verify OTP
      try {
        const response = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/verify-otp`, {
          email: formData.email,
          otp
        });
        
        // Save user to local storage
        localStorage.setItem('user', JSON.stringify(response.data));
        localStorage.setItem('token', response.data.token);
        
        // Redirect based on role
        if (response.data.role === 'admin') {
          navigate('/dashboard/admin');
        } else if (response.data.role === 'lender') {
          navigate('/dashboard/lender');
        } else {
          navigate('/dashboard/user');
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Invalid or expired OTP.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center pt-32 pb-12 px-4 sm:px-6 lg:px-8 selection:bg-orange-100 selection:text-orange-900 transition-colors duration-300">
      <div className="max-w-md w-full bg-white dark:bg-zinc-900 p-10 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm transition-colors duration-300">
        <div className="text-center mb-10">
          <div className="bg-zinc-50 dark:bg-zinc-800 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-zinc-100 dark:border-zinc-700 shadow-sm transition-colors duration-300">
            <Bike className="h-8 w-8 text-orange-500" />
          </div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Welcome Back</h2>
          <p className="mt-3 text-sm font-medium text-slate-500 dark:text-zinc-400">
            Sign in to continue to your dashboard.
          </p>
        </div>
        
        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl text-sm font-medium">
            {error}
          </div>
        )}
        
        <form className="space-y-6" onSubmit={handleSubmit}>
          {step === 1 ? (
            <>
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
            </>
          ) : (
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300 mb-2">Enter 6-digit OTP</label>
              <p className="text-xs font-medium text-slate-500 dark:text-zinc-400 mb-4">Sent to {formData.email}</p>
              <input
                name="otp"
                type="text"
                required
                maxLength="6"
                className="block w-full text-center tracking-[0.5em] text-2xl font-black px-4 py-4 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-slate-900 dark:text-white rounded-xl focus:bg-white dark:focus:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                onChange={(e) => setOtp(e.target.value)}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-4 px-4 border border-transparent rounded-full shadow-sm text-sm font-bold text-white dark:text-slate-900 bg-slate-900 dark:bg-white hover:bg-orange-500 dark:hover:bg-orange-500 dark:hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 transition-colors mt-8"
          >
            {loading ? 'Processing...' : step === 1 ? 'Sign in' : 'Verify OTP'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-sm font-medium text-slate-500 dark:text-zinc-400">
            Don't have an account?{' '}
            <Link to="/register" className="font-bold text-slate-900 dark:text-white hover:text-orange-500 dark:hover:text-orange-500 transition-colors">
              Register here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
