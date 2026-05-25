import { useState, useEffect, useRef, useCallback } from 'react';
import { User, MapPin, History, LayoutDashboard, Wallet, CreditCard, Settings, ChevronRight, Navigation, Bell, CheckCircle, XCircle, Battery, Star, MessageCircle } from 'lucide-react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useNotification } from '../../contexts/NotificationContext';
import LenderMessagesTab from './LenderMessagesTab';

const UserDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [toast, setToast] = useState(null); // { type: 'success'|'error', message }
  const { socket } = useNotification();
  const [searchParams] = useSearchParams();

  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : { name: 'User', role: 'user' };
  const initials = user.name ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U';

  // Switch tab from URL params (e.g., from notifications or BookingFlow redirect)
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) {
      setActiveTab(tab);
      if (tab === 'bookings') {
        if (searchParams.get('confirmed')) {
          showToast('success', '🎉 Booking confirmed! Your ride is ready.');
        } else if (searchParams.get('pending')) {
          showToast('info', '⏳ Payment received! Awaiting lender confirmation.');
        }
      }
    }
  }, [searchParams]);

  // Socket.IO — join user room for notifications
  useEffect(() => {
    if (!socket || !user?._id) return;

    const handleBookingConfirmed = ({ vehicleName, message }) => {
      showToast('success', `✅ ${message}`);
      // Refresh bookings tab
      setActiveTab(prev => prev); // trigger re-render trick
    };

    const handleBookingRejected = ({ vehicleName, message }) => {
      showToast('error', `❌ ${message}`);
    };

    const handleNewBookingRequest = ({ message }) => {
      showToast('info', `📨 ${message}`);
    };

    const handleDeliveryUpdate = ({ message }) => {
      showToast('info', `🚚 ${message}`);
      setActiveTab(prev => prev);
    };

    socket.on('booking-confirmed', handleBookingConfirmed);
    socket.on('booking-rejected', handleBookingRejected);
    socket.on('new-booking-request', handleNewBookingRequest);
    socket.on('delivery-update', handleDeliveryUpdate);

    return () => {
      socket.off('booking-confirmed', handleBookingConfirmed);
      socket.off('booking-rejected', handleBookingRejected);
      socket.off('new-booking-request', handleNewBookingRequest);
      socket.off('delivery-update', handleDeliveryUpdate);
    };
  }, [socket, user?._id]);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 6000);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'overview': return <OverviewTab />;
      case 'profile': return <ProfileTab />;
      case 'bookings': return <BookingsTab />;
      case 'messages': return <LenderMessagesTab />;
      case 'wallet': return <WalletTab />;
      default: return <OverviewTab />;
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pt-28 pb-20 selection:bg-orange-100 selection:text-orange-900 transition-colors duration-300">
      <div className="container mx-auto px-6 max-w-7xl">

        {/* Toast notification */}
        {toast && (
          <div className={`fixed top-24 right-6 z-[500] max-w-sm w-full p-4 rounded-2xl shadow-2xl flex items-start gap-3 animate-fade-in-up border ${
            toast.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-900/40 border-emerald-200 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300' :
            toast.type === 'error'   ? 'bg-red-50 dark:bg-red-900/40 border-red-200 dark:border-red-700 text-red-800 dark:text-red-300' :
            'bg-blue-50 dark:bg-blue-900/40 border-blue-200 dark:border-blue-700 text-blue-800 dark:text-blue-300'
          }`}>
            <Bell className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="font-bold text-sm flex-1">{toast.message}</p>
            <button onClick={() => setToast(null)} className="shrink-0 opacity-60 hover:opacity-100"><XCircle className="w-4 h-4" /></button>
          </div>
        )}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <div className="w-full lg:w-1/4">
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm sticky top-28 transition-colors duration-300">
              <div className="flex items-center space-x-4 mb-8">
                <div className="w-14 h-14 bg-orange-100 dark:bg-orange-500/20 text-orange-500 rounded-full flex items-center justify-center font-black text-xl">
                  {initials}
                </div>
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white">{user.name}</h3>
                  <p className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">{user.role} Account</p>
                </div>
              </div>

              <nav className="space-y-2">
                <SidebarItem 
                  icon={<LayoutDashboard />} label="Overview" 
                  active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} 
                />
                <SidebarItem 
                  icon={<User />} label="Profile & KYC" 
                  active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} 
                />
                <SidebarItem 
                  icon={<MessageCircle />} label="Messages" 
                  active={activeTab === 'messages'} onClick={() => setActiveTab('messages')} 
                />
                <SidebarItem 
                  icon={<History />} label="My Bookings" 
                  active={activeTab === 'bookings'} onClick={() => setActiveTab('bookings')} 
                />
                <SidebarItem 
                  icon={<Wallet />} label="Wallet & Credits" 
                  active={activeTab === 'wallet'} onClick={() => setActiveTab('wallet')} 
                />
                <SidebarItem 
                  icon={<Settings />} label="Settings" 
                  active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} 
                />
              </nav>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="w-full lg:w-3/4">
            {renderContent()}
          </div>
        </div>

      </div>
    </div>
  );
};

// Sub-components for Tabs

const OverviewTab = () => {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // AI Recommendation State
  const [aiQuery, setAiQuery] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMessage, setAiMessage] = useState(null);
  const [aiRecommendedIds, setAiRecommendedIds] = useState([]);

  // removed duplicate useEffect

  // Location Search State
  const [locationSearch, setLocationSearch] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [fallbackMessage, setFallbackMessage] = useState(null);

  const fetchVehicles = useCallback(async (search = '', lat = null, lng = null) => {
    setLoading(true);
    setFallbackMessage(null);
    try {
      let url = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/vehicles?`;
      if (search) url += `search=${encodeURIComponent(search)}&`;
      if (lat && lng) url += `lat=${lat}&lng=${lng}&radius=50`;
      
      const res = await axios.get(url);
      
      if ((search || (lat && lng)) && res.data.length === 0) {
        setFallbackMessage(`No vehicles found near ${search || 'your location'}. Showing other available vehicles.`);
        const fallbackRes = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/vehicles`);
        setVehicles(fallbackRes.data.slice(0, 4));
      } else {
        setVehicles(res.data.slice(0, 4)); // Show up to 4 nearby
      }
    } catch (err) {
      console.error("Failed to fetch vehicles for overview", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  const handleLocationSearch = (e) => {
    e.preventDefault();
    fetchVehicles(locationSearch);
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        const { latitude, longitude } = position.coords;
        const res = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`, {
          headers: { 'Accept-Language': 'en' }
        });
        const city = res.data.address?.city || res.data.address?.town || res.data.address?.state || '';
        if (city) {
          setLocationSearch(city);
        }
        // Pass the coordinates directly to fetch vehicles in that geographic radius
        fetchVehicles(city, latitude, longitude);
      } catch (err) {
        console.error("Reverse geocoding failed", err);
        // Fallback to just coordinates if geocoding fails
        fetchVehicles('', position.coords.latitude, position.coords.longitude);
      } finally {
        setIsLocating(false);
      }
    }, () => {
      alert("Unable to retrieve your location");
      setIsLocating(false);
    });
  };

  const handleAiRecommend = async (e) => {
    e.preventDefault();
    if (!aiQuery.trim()) return;
    
    setAiLoading(true);
    setAiMessage(null);
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/ai/recommend`, { query: aiQuery });
      setAiMessage(res.data.message);
      setAiRecommendedIds(res.data.recommendedIds || []);
    } catch (err) {
      console.error(err);
      setAiMessage('Oops! I could not find a recommendation right now.');
    } finally {
      setAiLoading(false);
    }
  };

  const displayedVehicles = aiRecommendedIds.length > 0 
    ? vehicles.filter(v => aiRecommendedIds.includes(v._id))
    : vehicles;

  return (
    <div className="space-y-8 animate-fade-in-up">
      <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-6">Dashboard Overview</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <DashboardCard title="Active Rentals" icon={<MapPin className="text-orange-500" />} value="0" />
        <DashboardCard title="Past Bookings" icon={<History className="text-orange-500" />} value="12" />
        <DashboardCard title="Wallet Balance" icon={<CreditCard className="text-orange-500" />} value="₹450" />
      </div>

      {/* AI Recommendation Banner */}
      <div className="bg-gradient-to-r from-orange-500 to-rose-500 rounded-3xl p-6 md:p-8 shadow-lg text-white flex flex-col md:flex-row items-center gap-6 justify-between">
        <div className="flex-1">
          <h3 className="text-2xl font-black mb-2 flex items-center gap-2">✨ Ask AI for a Recommendation</h3>
          <p className="font-medium opacity-90 mb-4">Not sure what to rent? Describe your trip and let AI find the perfect ride for you.</p>
          {aiMessage && (
            <div className="bg-white/20 p-4 rounded-xl border border-white/30 backdrop-blur-sm mb-4">
              <p className="font-bold">{aiMessage}</p>
              <button onClick={() => { setAiQuery(''); setAiMessage(null); setAiRecommendedIds([]); }} className="mt-2 text-sm underline hover:text-white/80">Clear Recommendation</button>
            </div>
          )}
          <form onSubmit={handleAiRecommend} className="flex gap-2 w-full max-w-xl">
            <input 
              type="text" 
              value={aiQuery}
              onChange={(e) => setAiQuery(e.target.value)}
              placeholder="e.g., I need a bike for a 3-day mountain trip..."
              className="flex-1 px-4 py-3 bg-white dark:bg-zinc-800 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-300 shadow-inner"
            />
            <button 
              type="submit" 
              disabled={aiLoading || !aiQuery.trim()}
              className="px-6 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-black transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              {aiLoading ? 'Thinking...' : 'Find Ride'}
            </button>
          </form>
        </div>
        <div className="hidden md:block w-32 h-32 bg-white/10 rounded-full flex items-center justify-center border-4 border-white/20">
           <span className="text-5xl">🤖</span>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm transition-colors duration-300">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Explore Nearby Vehicles</h2>
          <div className="flex w-full md:w-auto items-center gap-2">
            <form onSubmit={handleLocationSearch} className="flex flex-1 md:w-64 relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                value={locationSearch}
                onChange={(e) => setLocationSearch(e.target.value)}
                placeholder="Enter city or area..."
                className="w-full pl-9 pr-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-900 dark:text-white"
              />
              <button type="submit" className="hidden">Search</button>
            </form>
            <button 
              onClick={handleUseCurrentLocation}
              disabled={isLocating}
              className="px-4 py-2 bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 font-bold rounded-xl text-sm hover:bg-orange-100 dark:hover:bg-orange-500/20 transition-colors whitespace-nowrap flex items-center gap-2 disabled:opacity-50"
            >
              <Navigation className="w-4 h-4" />
              {isLocating ? 'Locating...' : 'Near Me'}
            </button>
            <Link to="/vehicles" className="px-4 py-2 text-slate-500 hover:text-orange-500 font-bold text-sm whitespace-nowrap">View All</Link>
          </div>
        </div>

        {fallbackMessage && (
          <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl flex items-center gap-3 text-amber-800 dark:text-amber-300">
            <span className="text-xl">⚠️</span>
            <p className="font-semibold text-sm">{fallbackMessage}</p>
          </div>
        )}
        
        {loading ? (
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {[1, 2].map(n => <div key={n} className="bg-zinc-200 dark:bg-zinc-800 animate-pulse rounded-[2rem] h-64"></div>)}
           </div>
        ) : displayedVehicles.length === 0 ? (
          <div className="text-center py-10 bg-zinc-50 dark:bg-zinc-800 border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-2xl">
            <p className="text-slate-500 dark:text-zinc-400 font-medium">No vehicles found. Try adjusting your search.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {displayedVehicles.map(vehicle => (
              <div key={vehicle._id} className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-[2rem] p-4 shadow-sm hover:shadow-md transition-all flex flex-col">
                <div className="h-32 bg-white dark:bg-zinc-900 rounded-xl mb-4 bg-cover bg-center border border-zinc-100 dark:border-zinc-700" style={{ backgroundImage: `url(http://localhost:5000${vehicle.imageUrl})` }}>
                  {!vehicle.imageUrl && <div className="w-full h-full flex items-center justify-center"><span className="text-4xl">🛵</span></div>}
                </div>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-black text-slate-900 dark:text-white">{vehicle.name}</h3>
                  <div className="flex items-center bg-orange-50 dark:bg-orange-500/10 px-2 py-0.5 rounded-lg text-orange-500 font-bold text-xs">
                    <Star className="w-3 h-3 fill-current mr-1" /> {vehicle.rating}
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-4 text-xs font-bold text-slate-500 dark:text-zinc-400">
                  <span className="flex items-center"><MapPin className="w-3 h-3 text-blue-500 mr-1"/> {vehicle.location}</span>
                  <span className="flex items-center"><Battery className="w-3 h-3 text-emerald-500 mr-1"/> {vehicle.range}</span>
                </div>
                <div className="flex items-center justify-between mt-auto pt-2 border-t border-zinc-200 dark:border-zinc-700">
                  <p className="font-black text-lg text-slate-900 dark:text-white">₹{vehicle.pricePerHour}<span className="text-sm font-semibold text-slate-500">/hr</span></p>
                  <Link to={`/vehicles/${vehicle._id}`} className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-bold rounded-lg hover:bg-orange-500 dark:hover:bg-orange-500 dark:hover:text-white transition-colors">Details</Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const ProfileTab = () => {
  const [profile, setProfile] = useState(null);
  const [kycFile, setKycFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  
  // Edit mode states
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ name: '', phone: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/users/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setProfile(res.data);
        setEditData({ name: res.data.name || '', phone: res.data.phone || '' });
      } catch (err) {
        console.error(err);
        setError(err.response?.data?.message || err.message || 'Failed to load profile');
      }
    };
    fetchProfile();
  }, []);

  const handleUpload = async () => {
    if (!kycFile) return;
    setUploading(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('kycDocument', kycFile);

      const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/users/kyc/upload`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      setProfile({ ...profile, kycStatus: res.data.kycStatus, kycDocumentUrl: res.data.kycDocumentUrl });
      alert(res.data.message);
    } catch (err) {
      console.error(err);
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/users/profile`, editData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProfile(res.data);
      setIsEditing(false);
      
      // Also update localStorage user object so the sidebar/navbar updates
      const userString = localStorage.getItem('user');
      if (userString) {
        const user = JSON.parse(userString);
        user.name = res.data.name;
        localStorage.setItem('user', JSON.stringify(user));
        // Force a reload or rely on react state for deep integration later
      }
    } catch (err) {
      console.error('Failed to update profile', err);
      alert('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (error) return <div className="text-red-500 font-bold p-8 bg-red-50 rounded-2xl border border-red-200">Error: {error}</div>;
  if (!profile) return <div className="text-slate-500 dark:text-zinc-400 font-bold">Loading profile...</div>;

  return (
    <div className="space-y-8 animate-fade-in-up">
      <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-6">Profile & KYC</h1>
      <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm transition-colors duration-300">
        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Personal Information</h2>
          {!isEditing ? (
            <button onClick={() => setIsEditing(true)} className="text-orange-500 font-bold text-sm hover:underline">Edit</button>
          ) : (
            <div className="flex space-x-3">
              <button onClick={() => { setIsEditing(false); setEditData({ name: profile.name, phone: profile.phone || '' }); }} className="text-slate-500 font-bold text-sm hover:underline">Cancel</button>
              <button onClick={handleSaveProfile} disabled={saving} className="text-orange-500 font-bold text-sm hover:underline">{saving ? 'Saving...' : 'Save'}</button>
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm font-medium text-slate-500 dark:text-zinc-400">
          <div>
            <p className="uppercase tracking-wider text-xs mb-1">Full Name</p>
            {isEditing ? (
              <input 
                type="text" 
                value={editData.name} 
                onChange={(e) => setEditData({...editData, name: e.target.value})} 
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-slate-900 dark:text-white font-bold text-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            ) : (
              <p className="text-slate-900 dark:text-white font-bold text-lg">{profile.name}</p>
            )}
          </div>
          <div>
            <p className="uppercase tracking-wider text-xs mb-1">Email</p>
            <p className="text-slate-900 dark:text-white font-bold text-lg opacity-70 cursor-not-allowed">{profile.email}</p>
          </div>
          <div>
            <p className="uppercase tracking-wider text-xs mb-1">Phone Number</p>
            {isEditing ? (
              <input 
                type="text" 
                value={editData.phone} 
                onChange={(e) => setEditData({...editData, phone: e.target.value})} 
                placeholder="Not provided"
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-slate-900 dark:text-white font-bold text-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            ) : (
              <p className="text-slate-900 dark:text-white font-bold text-lg">{profile.phone || 'Not provided'}</p>
            )}
          </div>
        </div>
        
        <div className="mt-8 pt-8 border-t border-zinc-100 dark:border-zinc-800">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Identity Verification</h2>
          <div className={`p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border ${
            profile.kycStatus === 'verified' 
            ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30' 
            : profile.kycStatus === 'submitted'
            ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30'
            : 'bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/30'
          }`}>
            <div>
              <p className={`font-bold ${
                profile.kycStatus === 'verified' ? 'text-emerald-600 dark:text-emerald-400'
                : profile.kycStatus === 'submitted' ? 'text-blue-600 dark:text-blue-400'
                : 'text-orange-600 dark:text-orange-400'
              }`}>
                KYC Status: <span className="uppercase">{profile.kycStatus}</span>
              </p>
              <p className="text-sm font-medium opacity-80 mt-1 text-slate-600 dark:text-zinc-400">
                {profile.kycStatus === 'verified' ? 'Your identity is verified. You can now rent vehicles.'
                : profile.kycStatus === 'submitted' ? 'Your document is under review by an admin.'
                : 'Please submit Driving License id to unlock rentals.'}
              </p>
            </div>
            
            {(profile.kycStatus === 'pending' || profile.kycStatus === 'rejected') && (
              <div className="flex flex-col space-y-2 w-full md:w-auto">
                <input 
                  type="file" 
                  onChange={(e) => setKycFile(e.target.files[0])}
                  className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100 dark:file:bg-orange-500/20 dark:file:text-orange-500 dark:hover:file:bg-orange-500/30 transition-colors"
                  accept="image/*,.pdf"
                />
                <button 
                  onClick={handleUpload}
                  disabled={!kycFile || uploading}
                  className="px-6 py-2 bg-orange-500 text-white font-bold rounded-full hover:bg-orange-600 disabled:opacity-50 transition-colors whitespace-nowrap"
                >
                  {uploading ? 'Submitting...' : 'Submit Driving License id'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const BookingsTab = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/bookings/my-bookings`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setBookings(res.data);
      } catch (err) {
        console.error(err);
        setError('Failed to load bookings');
      } finally {
        setLoading(false);
      }
    };
    fetchBookings();
  }, []);

  return (
    <div className="space-y-8 animate-fade-in-up">
      <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-6">My Bookings</h1>
      <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm transition-colors duration-300">
        {loading ? (
          <p className="text-slate-500 font-bold">Loading bookings...</p>
        ) : error ? (
          <p className="text-red-500 font-bold">{error}</p>
        ) : bookings.length === 0 ? (
          <div className="text-center py-10">
            <span className="text-4xl block mb-4">🛵</span>
            <p className="text-slate-500 font-bold text-lg">You haven't booked any vehicles yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map(booking => (
              <div key={booking._id} className="flex flex-col md:flex-row md:items-center justify-between p-6 border border-zinc-100 dark:border-zinc-800 rounded-2xl gap-4">
                <div className="flex items-center space-x-4">
                  <div
                    className="w-16 h-16 bg-zinc-50 dark:bg-zinc-800 rounded-xl flex items-center justify-center border border-zinc-200 dark:border-zinc-700 bg-cover bg-center shrink-0"
                    style={{ backgroundImage: booking.vehicle?.imageUrl ? `url(http://localhost:5000${booking.vehicle.imageUrl})` : 'none' }}
                  >
                    {!booking.vehicle?.imageUrl && <span className="text-3xl">🛵</span>}
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 dark:text-white">{booking.vehicle?.name || 'Unknown Vehicle'}</h3>
                    <p className="text-sm font-medium text-slate-500 dark:text-zinc-400">
                      {new Date(booking.createdAt).toLocaleDateString()} • {booking.durationHours} Hours
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <div className="text-left sm:text-right">
                    <p className="font-black text-slate-900 dark:text-white text-xl">₹{booking.totalAmount}</p>
                    {booking.status === 'pending' ? (
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></span>
                        <span className="text-xs font-bold text-amber-600 dark:text-amber-400">Awaiting lender confirmation</span>
                      </div>
                    ) : (
                      <span className={`inline-block px-3 py-1 text-xs font-bold rounded-lg mt-1 uppercase tracking-wider ${
                        booking.status === 'confirmed'  ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                        booking.status === 'cancelled'  ? 'bg-red-50 dark:bg-red-500/10 text-red-500' :
                        booking.status === 'completed'  ? 'bg-slate-100 dark:bg-slate-800 text-slate-500' :
                        'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                      }`}>
                        {booking.status}
                      </span>
                    )}
                  </div>
                  {booking.status === 'confirmed' && (
                    <button
                      onClick={() => navigate(`/track/${booking._id}`)}
                      className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 transition-colors text-sm whitespace-nowrap"
                    >
                      <Navigation className="w-4 h-4" /> Track Ride
                    </button>
                  )}
                  {booking.status === 'completed' && (
                    <button
                      onClick={() => navigate(`/track/${booking._id}`)}
                      className="flex items-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-bold rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors text-sm whitespace-nowrap"
                    >
                      🔁 Replay Route
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const WalletTab = () => {
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [addAmount, setAddAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/users/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setBalance(res.data.walletBalance || 0);
      } catch (err) {
        console.error("Failed to load wallet balance", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleAddFunds = async (e) => {
    e.preventDefault();
    if (!addAmount || addAmount <= 0) return alert('Enter a valid amount');
    setIsProcessing(true);
    try {
      const token = localStorage.getItem('token');
      const orderRes = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/wallet/add-funds`, { amount: Number(addAmount) }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const order = orderRes.data;

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_Snsc6Pg1LbIYVH',
        amount: order.amount,
        currency: order.currency,
        name: 'BikeRentLelo',
        description: 'Add Funds to Wallet',
        order_id: order.id,
        handler: async (response) => {
          try {
            const verifyRes = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/wallet/verify-payment`, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              amount: addAmount
            }, {
              headers: { Authorization: `Bearer ${token}` }
            });
            setBalance(verifyRes.data.walletBalance);
            setShowAdd(false);
            setAddAmount('');
            alert('Funds added successfully!');
          } catch (err) {
            console.error('Payment verification failed', err);
            alert('Payment verification failed');
          }
        },
        theme: { color: '#f97316' }
      };
      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response){
          alert('Payment Failed: ' + response.error.description);
      });
      rzp.open();
    } catch (err) {
      console.error('Add Funds Error:', err);
      alert('Failed to initiate payment: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    if (!withdrawAmount || withdrawAmount <= 0) return alert('Enter a valid amount');
    if (Number(withdrawAmount) > balance) return alert('Insufficient balance');
    
    setIsProcessing(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/wallet/withdraw`, { amount: Number(withdrawAmount) }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBalance(res.data.walletBalance);
      setShowWithdraw(false);
      setWithdrawAmount('');
      alert('Withdrawal successful!');
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to withdraw');
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) return <div className="animate-pulse bg-zinc-200 dark:bg-zinc-800 h-64 rounded-3xl w-full"></div>;

  return (
    <div className="space-y-8 animate-fade-in-up">
      <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-6">Wallet & Credits</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900 dark:bg-white p-8 rounded-3xl shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Wallet className="w-32 h-32 text-white dark:text-slate-900" />
          </div>
          <p className="text-slate-400 dark:text-zinc-500 font-bold uppercase tracking-widest text-sm mb-2">Available Balance</p>
          <p className="text-5xl font-black text-white dark:text-slate-900 mb-8">₹{balance.toFixed(2)}</p>
          <div className="flex gap-4 relative z-10 flex-wrap">
            <button onClick={() => { setShowAdd(!showAdd); setShowWithdraw(false); }} className="px-6 py-3 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 transition-colors">
              Add Funds
            </button>
            <button onClick={() => { setShowWithdraw(!showWithdraw); setShowAdd(false); }} className="px-6 py-3 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors border border-zinc-200 dark:border-zinc-700">
              Withdraw
            </button>
          </div>
          
          {showAdd && (
            <form onSubmit={handleAddFunds} className="mt-6 p-4 bg-white/10 dark:bg-slate-900/5 backdrop-blur-sm rounded-2xl border border-white/20 dark:border-slate-900/10">
              <label className="block text-sm font-bold text-white dark:text-slate-900 mb-2">Amount to Add (₹)</label>
              <div className="flex gap-2">
                <input type="number" value={addAmount} onChange={(e) => setAddAmount(e.target.value)} placeholder="0" className="flex-1 px-4 py-2 bg-white rounded-xl text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-orange-500 border border-transparent focus:border-orange-500" required />
                <button type="submit" disabled={isProcessing} className="px-4 py-2 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-50">Pay</button>
              </div>
            </form>
          )}

          {showWithdraw && (
            <form onSubmit={handleWithdraw} className="mt-6 p-4 bg-white/10 dark:bg-slate-900/5 backdrop-blur-sm rounded-2xl border border-white/20 dark:border-slate-900/10">
              <label className="block text-sm font-bold text-white dark:text-slate-900 mb-2">Amount to Withdraw (₹)</label>
              <div className="flex gap-2">
                <input type="number" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} placeholder="0" max={balance} className="flex-1 px-4 py-2 bg-white rounded-xl text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-orange-500 border border-transparent focus:border-orange-500" required />
                <button type="submit" disabled={isProcessing} className="px-4 py-2 bg-blue-500 text-white font-bold rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50">Confirm</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

// UI Helpers

const SidebarItem = ({ icon, label, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all duration-200 font-bold ${
      active 
      ? 'bg-orange-50 dark:bg-orange-500/10 text-orange-500' 
      : 'text-slate-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-slate-900 dark:hover:text-white'
    }`}
  >
    <div className="flex items-center space-x-3">
      {icon}
      <span>{label}</span>
    </div>
    {active && <ChevronRight className="w-4 h-4" />}
  </button>
);

const DashboardCard = ({ title, icon, value }) => (
  <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center space-x-6 transition-colors duration-300">
    <div className="p-4 bg-orange-50 dark:bg-orange-500/10 rounded-2xl transition-colors duration-300">{icon}</div>
    <div>
      <h3 className="text-slate-500 dark:text-zinc-400 text-sm font-bold tracking-wider uppercase mb-1">{title}</h3>
      <p className="text-3xl font-black text-slate-900 dark:text-white">{value}</p>
    </div>
  </div>
);

export default UserDashboard;
