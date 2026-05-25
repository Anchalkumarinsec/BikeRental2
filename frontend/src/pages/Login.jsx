import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Bike } from 'lucide-react';

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [step, setStep] = useState(1);
  const [view, setView] = useState('login'); // 'login' | 'forgot'
  const [forgotStep, setForgotStep] = useState(1);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (view === 'login') {
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
        // Step 2: Verify OTP for Login
        try {
          const response = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/verify-otp`, {
            email: formData.email,
            otp
          });
          
          localStorage.setItem('user', JSON.stringify(response.data));
          localStorage.setItem('token', response.data.token);
          
          if (response.data.role === 'admin') navigate('/dashboard/admin');
          else if (response.data.role === 'lender') navigate('/dashboard/lender');
          else if (response.data.role === 'delivery_agent') navigate('/dashboard/delivery-agent');
          else navigate('/dashboard/user');
        } catch (err) {
          setError(err.response?.data?.message || 'Invalid or expired OTP.');
        } finally {
          setLoading(false);
        }
      }
    } else if (view === 'forgot') {
      if (forgotStep === 1) {
        // Request OTP for password reset
        try {
          await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/forgot-password`, { email: formData.email });
          setForgotStep(2);
          setSuccess('OTP sent to your email.');
        } catch (err) {
          setError(err.response?.data?.message || 'Failed to send OTP.');
        } finally {
          setLoading(false);
        }
      } else {
        // Submit OTP and new password
        try {
          await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/reset-password`, {
            email: formData.email,
            otp,
            newPassword
          });
          setView('login');
          setForgotStep(1);
          setOtp('');
          setNewPassword('');
          setFormData({ ...formData, password: '' });
          setSuccess('Password reset successful! You can now log in.');
        } catch (err) {
          setError(err.response?.data?.message || 'Failed to reset password.');
        } finally {
          setLoading(false);
        }
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

        {success && (
          <div className="mb-6 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900 text-emerald-600 dark:text-emerald-400 px-4 py-3 rounded-xl text-sm font-medium">
            {success}
          </div>
        )}
        
        <form className="space-y-6" onSubmit={handleSubmit}>
          {view === 'login' ? (
            step === 1 ? (
              <>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300 mb-2">Email address</label>
                  <input
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    className="block w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:bg-white dark:focus:bg-zinc-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300">Password</label>
                    <button type="button" onClick={() => { setView('forgot'); setError(''); setSuccess(''); }} className="text-sm font-bold text-orange-500 hover:text-orange-600">
                      Forgot Password?
                    </button>
                  </div>
                  <input
                    name="password"
                    type="password"
                    required
                    value={formData.password}
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
                  value={otp}
                  maxLength="6"
                  className="block w-full text-center tracking-[0.5em] text-2xl font-black px-4 py-4 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-slate-900 dark:text-white rounded-xl focus:bg-white dark:focus:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                  onChange={(e) => setOtp(e.target.value)}
                />
              </div>
            )
          ) : (
            // Forgot Password View
            forgotStep === 1 ? (
              <>
                <div className="text-center mb-4">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Reset Password</h3>
                  <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">Enter your email to receive a reset code.</p>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300 mb-2">Email address</label>
                  <input
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    className="block w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:bg-white dark:focus:bg-zinc-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                    onChange={handleChange}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="text-center mb-4">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Create New Password</h3>
                  <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">Enter the 6-digit OTP sent to {formData.email}.</p>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300 mb-2">Enter 6-digit OTP</label>
                  <input
                    name="otp"
                    type="text"
                    required
                    value={otp}
                    maxLength="6"
                    className="block w-full text-center tracking-[0.5em] text-2xl font-black px-4 py-4 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-slate-900 dark:text-white rounded-xl focus:bg-white dark:focus:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors mb-4"
                    onChange={(e) => setOtp(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300 mb-2">New Password</label>
                  <input
                    name="newPassword"
                    type="password"
                    required
                    value={newPassword}
                    className="block w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:bg-white dark:focus:bg-zinc-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
              </>
            )
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-4 px-4 border border-transparent rounded-full shadow-sm text-sm font-bold text-white dark:text-slate-900 bg-slate-900 dark:bg-white hover:bg-orange-500 dark:hover:bg-orange-500 dark:hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 transition-colors mt-8"
          >
            {loading ? 'Processing...' : view === 'login' ? (step === 1 ? 'Sign in' : 'Verify OTP') : (forgotStep === 1 ? 'Send Reset Code' : 'Reset Password')}
          </button>
        </form>

        <div className="mt-8 text-center flex flex-col gap-2">
          <p className="text-sm font-medium text-slate-500 dark:text-zinc-400">
            Don't have an account?{' '}
            <Link to="/register" className="font-bold text-slate-900 dark:text-white hover:text-orange-500 dark:hover:text-orange-500 transition-colors">
              Register here
            </Link>
          </p>
          {view === 'forgot' && (
            <button onClick={() => { setView('login'); setError(''); setSuccess(''); }} className="text-sm font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
              Back to Login
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
