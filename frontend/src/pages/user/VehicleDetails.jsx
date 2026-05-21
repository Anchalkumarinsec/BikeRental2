import { useState, useEffect } from 'react';
import { MapPin, Battery, Star, Shield, Calendar, Clock, Zap, Navigation, MessageCircle } from 'lucide-react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import ChatWidget from '../../components/ChatWidget';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const VehicleDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Local state for booking selections
  const [pickupDate, setPickupDate] = useState(() => {
    const now = new Date();
    // Default to next hour
    now.setHours(now.getHours() + 1);
    now.setMinutes(0);
    // format as YYYY-MM-DDThh:mm
    return now.toISOString().slice(0, 16);
  });
  const [durationHours, setDurationHours] = useState(2);

  useEffect(() => {
    const fetchVehicle = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}`}/api/vehicles/${id}`);
        setVehicle(res.data);
      } catch (err) {
        console.error(err);
        setError('Vehicle not found or failed to load');
      } finally {
        setLoading(false);
      }
    };
    fetchVehicle();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pt-28 pb-20 flex justify-center items-center">
        <div className="animate-spin text-4xl">🛵</div>
      </div>
    );
  }

  if (error || !vehicle) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pt-28 pb-20 flex flex-col justify-center items-center">
        <h1 className="text-3xl font-bold mb-4">Oops!</h1>
        <p className="text-slate-500 mb-8">{error}</p>
        <Link to="/vehicles" className="px-6 py-3 bg-orange-500 text-white font-bold rounded-full">Back to Vehicles</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pt-28 pb-20 selection:bg-orange-100 selection:text-orange-900 transition-colors duration-300">
      <div className="container mx-auto px-6 max-w-6xl">
        
        {/* Breadcrumb */}
        <div className="flex items-center space-x-2 text-sm font-bold text-slate-500 dark:text-zinc-400 mb-8">
          <Link to="/vehicles" className="hover:text-slate-900 dark:hover:text-white">Vehicles</Link>
          <span>/</span>
          <span className="text-slate-900 dark:text-white">{vehicle.name}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Main Details (Left 2/3) */}
          <div className="lg:col-span-2 space-y-8">
            {/* Image Gallery */}
            <div 
              className="bg-white dark:bg-zinc-900 p-4 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm h-96 flex items-center justify-center transition-colors duration-300 bg-cover bg-center"
              style={{ backgroundImage: vehicle.imageUrl ? `url(${vehicle.imageUrl})` : 'none' }}
            >
              {!vehicle.imageUrl && <span className="text-9xl">🛵</span>}
            </div>
            
            {/* Description */}
            {vehicle.description && (
              <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm transition-colors duration-300">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-4">About this {vehicle.type}</h2>
                <p className="text-slate-600 dark:text-zinc-400 leading-relaxed font-medium">
                  {vehicle.description}
                </p>
              </div>
            )}
            
            {/* Specs Grid */}
            <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm transition-colors duration-300">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6">Specifications</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <SpecItem icon={<Battery className="text-emerald-500" />} label="Range" value={vehicle.range || 'N/A'} />
                <SpecItem icon={<Zap className="text-orange-500" />} label={vehicle.type === 'Electric Scooter' ? 'Battery' : 'Engine'} value={vehicle.specifications?.batteryOrEngine || 'N/A'} />
                <SpecItem icon={<MapPin className="text-blue-500" />} label="Location" value={vehicle.location || 'N/A'} />
                <SpecItem icon={<Shield className="text-purple-500" />} label="Top Speed" value={vehicle.specifications?.topSpeed || 'N/A'} />
              </div>
            </div>

            {/* Map & Location */}
            <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm transition-colors duration-300">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white">Location</h2>
                {vehicle.locationCoordinates?.lat && vehicle.locationCoordinates?.lng ? (
                  <a 
                    href={`https://www.google.com/maps/dir/?api=1&destination=${vehicle.locationCoordinates.lat},${vehicle.locationCoordinates.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold rounded-xl text-sm hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors"
                  >
                    <Navigation className="w-4 h-4" /> Get Directions
                  </a>
                ) : (
                  <span className="text-sm font-bold text-slate-400">Map unavailable</span>
                )}
              </div>
              <div className="h-64 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 relative z-0 flex items-center justify-center bg-zinc-50 dark:bg-zinc-800">
                {vehicle.locationCoordinates?.lat && vehicle.locationCoordinates?.lng ? (
                  <MapContainer center={[vehicle.locationCoordinates.lat, vehicle.locationCoordinates.lng]} zoom={15} style={{ height: '100%', width: '100%', zIndex: 0 }}>
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; OpenStreetMap contributors'
                    />
                    <Marker position={[vehicle.locationCoordinates.lat, vehicle.locationCoordinates.lng]}>
                      <Popup className="font-bold">{vehicle.name}</Popup>
                    </Marker>
                  </MapContainer>
                ) : (
                  <div className="text-center p-6">
                    <MapPin className="w-10 h-10 text-slate-300 dark:text-zinc-600 mx-auto mb-2" />
                    <p className="text-slate-500 dark:text-zinc-400 font-bold">Exact map coordinates not provided.</p>
                    <p className="text-sm text-slate-400 dark:text-zinc-500 mt-1">General Location: {vehicle.location}</p>
                  </div>
                )}
              </div>
            </div>

            {/* AI Recommendation Box */}
            <div className="bg-gradient-to-r from-orange-500 to-rose-500 p-[1px] rounded-3xl">
              <div className="bg-white dark:bg-zinc-900 p-8 rounded-[23px] h-full transition-colors duration-300">
                <div className="flex items-center space-x-2 mb-4">
                  <Zap className="w-5 h-5 text-orange-500" />
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Groq AI Recommendation</h3>
                </div>
                <p className="text-slate-600 dark:text-zinc-400 font-medium">This vehicle perfectly matches your previous riding history. Highly recommended for your preferred locations.</p>
              </div>
            </div>
          </div>

          {/* Booking Panel (Right 1/3) */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-lg sticky top-28 transition-colors duration-300">
              <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2">{vehicle.name}</h1>
              <div className="flex items-center space-x-2 text-sm font-bold text-slate-500 dark:text-zinc-400 mb-6">
                <Star className="w-4 h-4 text-orange-500 fill-current" />
                <span>{vehicle.rating} ({vehicle.reviewsCount || 0} reviews)</span>
              </div>

              <div className="flex items-baseline mb-8">
                <span className="text-5xl font-black text-slate-900 dark:text-white">₹{vehicle.pricePerHour}</span>
                <span className="text-slate-500 dark:text-zinc-400 font-semibold ml-2">/hour</span>
              </div>

              <div className="space-y-4 mb-8">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300 mb-2">Pickup Date & Time</label>
                  <div className="flex items-center bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3">
                    <Calendar className="w-5 h-5 text-slate-400 mr-3 shrink-0" />
                    <input 
                      type="datetime-local" 
                      value={pickupDate}
                      onChange={(e) => setPickupDate(e.target.value)}
                      className="bg-transparent text-slate-900 dark:text-white font-medium focus:outline-none w-full"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300 mb-2">Duration</label>
                  <div className="flex items-center bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3">
                    <Clock className="w-5 h-5 text-slate-400 mr-3 shrink-0" />
                    <select 
                      value={durationHours}
                      onChange={(e) => setDurationHours(Number(e.target.value))}
                      className="bg-transparent text-slate-900 dark:text-white font-medium focus:outline-none w-full appearance-none cursor-pointer"
                    >
                      <option value="1" className="text-black">1 Hour</option>
                      <option value="2" className="text-black">2 Hours</option>
                      <option value="5" className="text-black">5 Hours</option>
                      <option value="12" className="text-black">12 Hours</option>
                      <option value="24" className="text-black">24 Hours (1 Day)</option>
                      <option value="48" className="text-black">48 Hours (2 Days)</option>
                      <option value="168" className="text-black">7 Days (1 Week)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="border-t border-zinc-100 dark:border-zinc-800 pt-6 mb-8">
                <div className="flex justify-between text-sm font-bold text-slate-500 dark:text-zinc-400 mb-2">
                  <span>₹{vehicle.pricePerHour} x {durationHours} hours</span>
                  <span>₹{vehicle.pricePerHour * durationHours}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-slate-500 dark:text-zinc-400 mb-2">
                  <span>Platform Fee</span>
                  <span>₹5</span>
                </div>
                <div className="flex justify-between text-lg font-black text-slate-900 dark:text-white mt-4">
                  <span>Total</span>
                  <span>₹{(vehicle.pricePerHour * durationHours) + 5}</span>
                </div>
              </div>

              {vehicle.isAvailable ? (
                <button 
                  onClick={() => navigate(`/book/${id}?date=${pickupDate}&duration=${durationHours}`)}
                  className="w-full block text-center py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-full hover:bg-orange-500 dark:hover:bg-orange-500 dark:hover:text-white transition-colors shadow-lg mb-4"
                >
                  Proceed to Book
                </button>
              ) : (
                <button disabled className="w-full block text-center py-4 bg-zinc-200 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-500 font-bold rounded-full cursor-not-allowed mb-4">
                  Currently Unavailable
                </button>
              )}

              {vehicle.vendorId && (
                <button 
                  onClick={() => setIsChatOpen(true)}
                  className="w-full flex items-center justify-center gap-2 block text-center py-4 bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-500 font-bold rounded-full hover:bg-orange-100 dark:hover:bg-orange-500/20 transition-colors"
                >
                  <MessageCircle className="w-5 h-5" /> Chat with Lender
                </button>
              )}
            </div>
          </div>
        </div>

        {isChatOpen && vehicle.vendorId && (
          <ChatWidget 
            recipientId={vehicle.vendorId} 
            vehicle={vehicle}
            onClose={() => setIsChatOpen(false)} 
          />
        )}

      </div>
    </div>
  );
};

const SpecItem = ({ icon, label, value }) => (
  <div className="flex flex-col items-center justify-center p-4 bg-zinc-50 dark:bg-zinc-800 rounded-2xl border border-zinc-100 dark:border-zinc-700 text-center">
    <div className="mb-2">{icon}</div>
    <span className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1">{label}</span>
    <span className="text-lg font-black text-slate-900 dark:text-white truncate w-full">{value}</span>
  </div>
);

export default VehicleDetails;
