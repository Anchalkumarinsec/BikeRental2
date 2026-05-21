import { useState, useEffect } from 'react';
import { Users, Bike, Settings, CheckCircle, XCircle, FileText } from 'lucide-react';
import axios from 'axios';

const AdminDashboard = () => {
  const [pendingKyc, setPendingKyc] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPendingKyc = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/users/kyc-pending`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPendingKyc(res.data);
    } catch (error) {
      console.error('Error fetching KYC requests', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingKyc();
  }, []);

  const handleKycAction = async (userId, action) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}`}/api/users/kyc/${userId}/${action}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Remove the processed request from the UI
      setPendingKyc(pendingKyc.filter(user => user._id !== userId));
      alert(`KYC ${action}d successfully`);
    } catch (error) {
      console.error(`Error processing KYC ${action}`, error);
      alert('Action failed');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-8 pt-28 text-slate-900 dark:text-white selection:bg-orange-100 selection:text-orange-900 transition-colors duration-300">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-black mb-8 tracking-tight">Admin Dashboard</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <DashboardCard title="Total Users" icon={<Users className="text-orange-500" />} value="1,245" />
          <DashboardCard title="Total Vehicles" icon={<Bike className="text-orange-500" />} value="350" />
          <DashboardCard title="System Alerts" icon={<Settings className="text-orange-500" />} value={`${pendingKyc.length} Pending Verifications`} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Pending KYC Section */}
          <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm transition-colors duration-300 lg:col-span-2">
            <h2 className="text-2xl font-bold mb-6">Pending KYC Verifications</h2>
            
            {loading ? (
              <div className="text-slate-500 dark:text-zinc-400 font-bold">Loading requests...</div>
            ) : pendingKyc.length === 0 ? (
              <div className="p-8 border border-dashed border-zinc-200 dark:border-zinc-700 rounded-2xl text-center">
                <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3 opacity-50" />
                <p className="text-slate-500 dark:text-zinc-400 font-bold">No pending KYC requests!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingKyc.map((user) => (
                  <div key={user._id} className="flex flex-col md:flex-row items-center justify-between p-6 border border-zinc-100 dark:border-zinc-800 rounded-2xl">
                    <div className="mb-4 md:mb-0">
                      <h3 className="font-black text-lg">{user.name}</h3>
                      <p className="text-sm font-medium text-slate-500 dark:text-zinc-400">{user.email}</p>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <a 
                        href={`${import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}`}${user.kycDocumentUrl}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex items-center space-x-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-bold rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                      >
                        <FileText size={16} />
                        <span>View Document</span>
                      </a>
                      
                      <button 
                        onClick={() => handleKycAction(user._id, 'approve')}
                        className="flex items-center space-x-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-200 dark:border-emerald-500/30 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors"
                      >
                        <CheckCircle size={16} />
                        <span>Approve</span>
                      </button>

                      <button 
                        onClick={() => handleKycAction(user._id, 'reject')}
                        className="flex items-center space-x-2 px-4 py-2 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 font-bold border border-red-200 dark:border-red-500/30 rounded-xl hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
                      >
                        <XCircle size={16} />
                        <span>Reject</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm transition-colors duration-300">
            <h2 className="text-2xl font-bold mb-6">Recent Users</h2>
            <div className="h-64 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-2xl flex items-center justify-center transition-colors duration-300">
              <span className="text-slate-400 dark:text-zinc-500 font-semibold uppercase tracking-wider text-sm">User List Widget</span>
            </div>
          </div>
          <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm transition-colors duration-300">
            <h2 className="text-2xl font-bold mb-6">Platform Analytics (Groq AI)</h2>
            <div className="h-64 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-2xl flex items-center justify-center transition-colors duration-300">
              <span className="text-slate-400 dark:text-zinc-500 font-semibold uppercase tracking-wider text-sm">AI Demand Chart</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const DashboardCard = ({ title, icon, value }) => (
  <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center space-x-6 transition-colors duration-300">
    <div className="p-4 bg-orange-50 dark:bg-orange-500/10 rounded-2xl transition-colors duration-300">{icon}</div>
    <div>
      <h3 className="text-slate-500 dark:text-zinc-400 text-sm font-bold tracking-wider uppercase mb-1">{title}</h3>
      <p className="text-3xl font-black text-slate-900 dark:text-white">{value}</p>
    </div>
  </div>
);

export default AdminDashboard;
