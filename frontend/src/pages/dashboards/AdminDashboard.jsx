import { useState, useEffect } from 'react';
import { Users, Bike, Settings, CheckCircle, XCircle, FileText, Truck, MapPin } from 'lucide-react';
import axios from 'axios';

const AdminDashboard = () => {
  const [pendingKyc, setPendingKyc] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      
      const [kycRes, deliveryRes, agentsRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/users/kyc-pending`, config),
        axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/delivery/all`, config),
        axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/delivery/agents`, config)
      ]);
      
      setPendingKyc(kycRes.data);
      setDeliveries(deliveryRes.data);
      setAgents(agentsRes.data);
    } catch (error) {
      console.error('Error fetching dashboard data', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleKycAction = async (userId, action) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/users/kyc/${userId}/${action}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPendingKyc(pendingKyc.filter(user => user._id !== userId));
      alert(`KYC ${action}d successfully`);
    } catch (error) {
      console.error(`Error processing KYC ${action}`, error);
      alert('Action failed');
    }
  };

  const handleAssignAgent = async (bookingId, agentId) => {
    if (!agentId) return;
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/delivery/${bookingId}/assign`, { agentId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Agent assigned successfully');
      fetchDashboardData(); // Refresh list
    } catch (error) {
      console.error('Error assigning agent', error);
      alert('Assignment failed');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-8 pt-28 text-slate-900 dark:text-white selection:bg-orange-100 selection:text-orange-900 transition-colors duration-300">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-black mb-8 tracking-tight">Admin Dashboard</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <DashboardCard title="Total Users" icon={<Users className="text-orange-500" />} value="1,245" />
          <DashboardCard title="Total Vehicles" icon={<Bike className="text-orange-500" />} value="350" />
          <DashboardCard title="System Alerts" icon={<Settings className="text-orange-500" />} value={`${pendingKyc.length}`} />
          <DashboardCard title="Active Deliveries" icon={<Truck className="text-orange-500" />} value={deliveries.filter(d => d.deliveryStatus !== 'completed').length} />
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
                        href={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${user.kycDocumentUrl}`} 
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
          
          {/* Delivery Management Section */}
          <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm transition-colors duration-300 lg:col-span-2">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3"><Truck className="text-orange-500"/> Delivery Management</h2>
            
            {loading ? (
              <div className="text-slate-500 dark:text-zinc-400 font-bold">Loading deliveries...</div>
            ) : deliveries.length === 0 ? (
              <div className="p-8 border border-dashed border-zinc-200 dark:border-zinc-700 rounded-2xl text-center">
                <p className="text-slate-500 dark:text-zinc-400 font-bold">No delivery requests found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800 text-sm font-bold text-slate-500 dark:text-zinc-400">
                      <th className="pb-3 pr-4">Vehicle</th>
                      <th className="pb-3 px-4">Customer</th>
                      <th className="pb-3 px-4">Address</th>
                      <th className="pb-3 px-4">Status</th>
                      <th className="pb-3 pl-4">Agent Assignment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deliveries.map(d => (
                      <tr key={d._id} className="border-b border-zinc-100 dark:border-zinc-800/50">
                        <td className="py-4 pr-4 font-bold">{d.vehicle?.name}</td>
                        <td className="py-4 px-4 text-sm">{d.user?.name}</td>
                        <td className="py-4 px-4 text-sm max-w-[200px] truncate" title={d.deliveryAddress}>{d.deliveryAddress}</td>
                        <td className="py-4 px-4">
                          <span className={`px-2 py-1 text-xs font-black uppercase rounded-lg ${
                            d.deliveryStatus === 'completed' ? 'bg-emerald-100 text-emerald-600' :
                            d.deliveryStatus === 'pending' ? 'bg-amber-100 text-amber-600' :
                            'bg-blue-100 text-blue-600'
                          }`}>
                            {(d.deliveryStatus || 'pending').replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="py-4 pl-4">
                          {d.deliveryStatus === 'completed' ? (
                            <span className="text-sm font-bold text-slate-500">{d.assignedDeliveryAgent?.name} (Completed)</span>
                          ) : (
                            <div className="flex gap-2">
                              <select 
                                className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2 py-1.5 text-sm"
                                defaultValue={d.assignedDeliveryAgent?._id || ""}
                                onChange={(e) => handleAssignAgent(d._id, e.target.value)}
                              >
                                <option value="" disabled>Assign Agent</option>
                                {agents.map(agent => (
                                  <option key={agent._id} value={agent._id}>{agent.name}</option>
                                ))}
                              </select>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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
