import { useState, useEffect } from 'react';
import { Truck, MapPin, Phone, CheckCircle, XCircle, Navigation, Clock, Activity, Calendar } from 'lucide-react';
import axios from 'axios';
import { useNotification } from '../../contexts/NotificationContext';

const DeliveryAgentDashboard = () => {
  const [deliveries, setDeliveries] = useState([]);
  const [availableDeliveries, setAvailableDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('available'); // available, active, completed
  const { socket } = useNotification();

  const fetchDeliveries = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const [assignedRes, availableRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/delivery/me`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/delivery/available`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      setDeliveries(assignedRes.data);
      setAvailableDeliveries(availableRes.data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch deliveries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliveries();
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleDeliveryClaimed = ({ bookingId }) => {
      // Remove it from available deliveries if someone else claimed it
      setAvailableDeliveries(prev => prev.filter(d => d._id !== bookingId));
    };

    socket.on('delivery-claimed', handleDeliveryClaimed);

    return () => {
      socket.off('delivery-claimed', handleDeliveryClaimed);
    };
  }, [socket]);

  const handleStatusUpdate = async (id, status) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/delivery/${id}/status`, { status }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchDeliveries();
    } catch (err) {
      alert('Failed to update status');
    }
  };

  const handleAcceptDelivery = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/delivery/${id}/accept`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchDeliveries();
      setActiveTab('active');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to accept delivery');
      fetchDeliveries();
    }
  };

  const handleRejectDelivery = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/delivery/${id}/reject`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAvailableDeliveries(prev => prev.filter(d => d._id !== id));
    } catch (err) {
      console.error('Failed to reject delivery', err);
    }
  };

  const getNextAction = (status) => {
    switch(status) {
      case 'pending': return null;
      case 'assigned': return { label: 'Start Delivery', next: 'out_for_delivery', color: 'bg-blue-500 hover:bg-blue-600' };
      case 'out_for_delivery': return { label: 'Mark Delivered', next: 'delivered', color: 'bg-emerald-500 hover:bg-emerald-600' };
      case 'delivered': return { label: 'Start Pickup Journey', next: 'pickup_scheduled', color: 'bg-purple-500 hover:bg-purple-600' };
      case 'pickup_scheduled': return { label: 'Mark Picked Up', next: 'picked_up', color: 'bg-orange-500 hover:bg-orange-600' };
      case 'picked_up': return { label: 'Mark Completed (Returned)', next: 'completed', color: 'bg-green-600 hover:bg-green-700' };
      default: return null;
    }
  };

  const activeDeliveries = deliveries.filter(d => d.deliveryStatus !== 'completed');
  const completedDeliveries = deliveries.filter(d => d.deliveryStatus === 'completed');

  const displayDeliveries = activeTab === 'available' ? availableDeliveries : activeTab === 'active' ? activeDeliveries : completedDeliveries;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-8 pt-28 selection:bg-orange-100 selection:text-orange-900 transition-colors duration-300">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <Truck className="w-8 h-8 text-orange-500" />
            Agent Dashboard
          </h1>
          
          <div className="flex bg-white dark:bg-zinc-900 rounded-full p-1 border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <button
              onClick={() => setActiveTab('available')}
              className={`px-6 py-2 rounded-full font-bold text-sm transition-colors ${activeTab === 'available' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'text-slate-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
            >
              Available ({availableDeliveries.length})
            </button>
            <button
              onClick={() => setActiveTab('active')}
              className={`px-6 py-2 rounded-full font-bold text-sm transition-colors ${activeTab === 'active' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'text-slate-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
            >
              Active ({activeDeliveries.length})
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`px-6 py-2 rounded-full font-bold text-sm transition-colors ${activeTab === 'completed' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'text-slate-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
            >
              Completed ({completedDeliveries.length})
            </button>
          </div>
        </div>

        {error && <div className="mb-6 p-4 bg-red-50 text-red-500 font-bold rounded-2xl">{error}</div>}

        {loading ? (
          <div className="text-center py-20">
             <div className="animate-spin text-4xl mb-4">🔄</div>
             <p className="font-bold text-slate-500">Loading deliveries...</p>
          </div>
        ) : displayDeliveries.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 p-12 rounded-3xl border border-zinc-200 dark:border-zinc-800 text-center shadow-sm">
            <MapPin className="w-16 h-16 text-zinc-300 dark:text-zinc-700 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No {activeTab} deliveries</h2>
            <p className="text-slate-500 dark:text-zinc-400 font-medium">You're all caught up!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {displayDeliveries.map(delivery => {
              const nextAction = getNextAction(delivery.deliveryStatus);
              
              return (
                <div key={delivery._id} className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col md:flex-row transition-colors duration-300">
                  <div className="md:w-1/3 bg-zinc-50 dark:bg-zinc-800 p-6 flex flex-col justify-center items-center text-center border-b md:border-b-0 md:border-r border-zinc-200 dark:border-zinc-700">
                    <div 
                      className="w-24 h-24 rounded-2xl bg-zinc-200 dark:bg-zinc-700 mb-4 bg-cover bg-center border border-zinc-300 dark:border-zinc-600"
                      style={{ backgroundImage: delivery.vehicle?.imageUrl ? `url(http://localhost:5000${delivery.vehicle.imageUrl})` : 'none' }}
                    >
                      {!delivery.vehicle?.imageUrl && <span className="text-4xl mt-6 block">🛵</span>}
                    </div>
                    <h3 className="font-black text-lg text-slate-900 dark:text-white">{delivery.vehicle?.name}</h3>
                    <p className="text-sm font-bold text-slate-500 dark:text-zinc-400 mt-1">₹{delivery.deliveryCharge} Fee</p>
                    <span className="mt-4 px-3 py-1 bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 font-black text-xs uppercase tracking-wider rounded-lg">
                      {(delivery.deliveryStatus || 'pending').replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div className="p-6 md:w-2/3 flex flex-col">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Customer Details</p>
                        <h4 className="font-black text-xl text-slate-900 dark:text-white">{delivery.user?.name}</h4>
                      </div>
                      {delivery.user?.phone && (
                        <a href={`tel:${delivery.user.phone}`} className="w-10 h-10 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-500/20 dark:text-emerald-400 rounded-full flex items-center justify-center transition-colors">
                          <Phone className="w-5 h-5" />
                        </a>
                      )}
                    </div>

                    <div className="space-y-4 mb-6">
                      <div className="flex items-start gap-3">
                        <MapPin className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-bold text-slate-500 dark:text-zinc-400">Delivery Address</p>
                          <p className="font-medium text-slate-900 dark:text-white">{delivery.deliveryAddress}</p>
                          {delivery.deliveryCoordinates && (
                             <a href={`https://www.google.com/maps/dir/?api=1&destination=${delivery.deliveryCoordinates.lat},${delivery.deliveryCoordinates.lng}`} target="_blank" rel="noreferrer" className="text-xs font-bold text-blue-500 hover:underline mt-1 inline-block">View on Maps</a>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-start gap-3">
                          <Calendar className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs font-bold text-slate-500 dark:text-zinc-400">Deliver By</p>
                            <p className="font-bold text-sm text-slate-900 dark:text-white">{new Date(delivery.deliveryDate).toLocaleString()}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <Clock className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs font-bold text-slate-500 dark:text-zinc-400">Pickup After</p>
                            <p className="font-bold text-sm text-slate-900 dark:text-white">{new Date(delivery.pickupDate).toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-auto">
                      {activeTab === 'available' ? (
                        <div className="flex gap-4">
                          <button
                            onClick={() => handleAcceptDelivery(delivery._id)}
                            className="flex-1 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-xl transition-colors shadow-md flex items-center justify-center gap-2"
                          >
                            <CheckCircle className="w-5 h-5" /> Accept
                          </button>
                          <button
                            onClick={() => handleRejectDelivery(delivery._id)}
                            className="flex-1 py-4 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 font-black rounded-xl transition-colors flex items-center justify-center gap-2"
                          >
                            <XCircle className="w-5 h-5" /> Reject
                          </button>
                        </div>
                      ) : nextAction ? (
                        <button
                          onClick={() => handleStatusUpdate(delivery._id, nextAction.next)}
                          className={`w-full py-4 text-white font-black rounded-xl transition-colors shadow-md flex items-center justify-center gap-2 ${nextAction.color}`}
                        >
                          <Navigation className="w-5 h-5" />
                          {nextAction.label}
                        </button>
                      ) : (
                        <div className="w-full py-3 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold rounded-xl flex items-center justify-center gap-2">
                          <CheckCircle className="w-5 h-5" /> Order Complete
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default DeliveryAgentDashboard;
