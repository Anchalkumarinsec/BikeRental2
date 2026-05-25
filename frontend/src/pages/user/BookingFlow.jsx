import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { CreditCard, CheckCircle, Clock, Truck, MapPin, Search } from 'lucide-react';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
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

const MapClickPicker = ({ onPick }) => {
  useMapEvents({ click(e) { onPick([e.latlng.lat, e.latlng.lng]); } });
  return null;
};

const FlyTo = ({ center }) => {
  const map = useMap();
  useEffect(() => { if (center) map.flyTo(center, 15, { duration: 1 }); }, [center]);
  return null;
};

const BookingFlow = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Initialize from query params if available
  const initialDuration = Number(searchParams.get('duration')) || 2;
  const initialDate = searchParams.get('date') || (() => {
    const now = new Date();
    now.setHours(now.getHours() + 1);
    now.setMinutes(0);
    return now.toISOString().slice(0, 16);
  })();

  const [durationHours, setDurationHours] = useState(initialDuration);
  const [pickupDate, setPickupDate] = useState(initialDate);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [walletBalance, setWalletBalance] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('razorpay');

  // Delivery States
  const [deliveryOption, setDeliveryOption] = useState('self_pickup');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryCoordinates, setDeliveryCoordinates] = useState(null);
  const [deliveryCharge, setDeliveryCharge] = useState(0);
  const [osrmDistance, setOsrmDistance] = useState(null);
  const [deliveryError, setDeliveryError] = useState('');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [mapCenter, setMapCenter] = useState([20.5937, 78.9629]);

  // Load Razorpay script dynamically
  useEffect(() => {
    const loadRazorpay = () => {
      return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
      });
    };
    loadRazorpay();
  }, []);

  // Fetch Vehicle
  useEffect(() => {
    const fetchVehicle = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/vehicles/${id}`);
        setVehicle(res.data);
        if (res.data.locationCoordinates) {
          setMapCenter([res.data.locationCoordinates.lat, res.data.locationCoordinates.lng]);
        }
        const token = localStorage.getItem('token');
        if (token) {
          const profileRes = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/users/profile`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setWalletBalance(profileRes.data.walletBalance || 0);
        }
      } catch (err) {
        console.error(err);
        setError('Vehicle not found');
      } finally {
        setLoading(false);
      }
    };
    fetchVehicle();
  }, [id]);

  // Handle Location Search
  const handleLocationSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setDeliveryError('');
    try {
      const res = await axios.get(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      if (res.data?.length > 0) {
        const { lat, lon, display_name } = res.data[0];
        const c = [parseFloat(lat), parseFloat(lon)];
        setMapCenter(c);
        setDeliveryCoordinates({ lat: c[0], lng: c[1] });
        setDeliveryAddress(display_name);
      } else {
        setDeliveryError('Location not found.');
      }
    } catch {
      setDeliveryError('Search failed.');
    } finally {
      setSearching(false);
    }
  };

  const requestGPS = () => {
    if (!navigator.geolocation) {
      setDeliveryError('Geolocation is not supported by your browser.');
      return;
    }
    setGpsLoading(true);
    setDeliveryError('');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const c = [pos.coords.latitude, pos.coords.longitude];
        setMapCenter(c);
        setDeliveryCoordinates({ lat: c[0], lng: c[1] });
        // Try reverse geocode to get address
        try {
          const res = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${c[0]}&lon=${c[1]}`);
          if (res.data && res.data.display_name) {
             setDeliveryAddress(res.data.display_name);
             setSearchQuery(res.data.display_name);
          } else {
             setDeliveryAddress('Current Location (GPS)');
          }
        } catch {
          setDeliveryAddress('Current Location (GPS)');
        }
        setGpsLoading(false);
      },
      () => {
        setDeliveryError('Unable to retrieve your location.');
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleMapClick = async (c) => {
    setMapCenter(c);
    setDeliveryCoordinates({ lat: c[0], lng: c[1] });
    try {
      const res = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${c[0]}&lon=${c[1]}`);
      if (res.data && res.data.display_name) {
         setDeliveryAddress(res.data.display_name);
         setSearchQuery(res.data.display_name);
      } else {
         setDeliveryAddress('Pinned Location');
      }
    } catch {
      setDeliveryAddress('Pinned Location');
    }
  };

  // Calculate OSRM Route & Price
  useEffect(() => {
    const calculateRoute = async () => {
      if (deliveryOption === 'self_pickup') {
        setDeliveryCharge(0);
        setOsrmDistance(null);
        setDeliveryError('');
        return;
      }
      if (deliveryOption === 'delivery' && deliveryCoordinates && vehicle?.locationCoordinates) {
        try {
          const { lng: startLng, lat: startLat } = vehicle.locationCoordinates;
          const { lng: endLng, lat: endLat } = deliveryCoordinates;
          
          const res = await axios.get(
            `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=false`
          );
          
          if (res.data.routes && res.data.routes.length > 0) {
            const distanceKm = res.data.routes[0].distance / 1000;
            setOsrmDistance(distanceKm.toFixed(1));
            
            if (distanceKm <= 5) setDeliveryCharge(50);
            else if (distanceKm <= 10) setDeliveryCharge(100);
            else if (distanceKm <= 20) setDeliveryCharge(150);
            else {
              setDeliveryCharge(0);
              setDeliveryError('Delivery unavailable for locations > 20km from the vehicle.');
            }
          }
        } catch (err) {
          console.error(err);
          setDeliveryError('Failed to calculate route.');
        }
      }
    };
    calculateRoute();
  }, [deliveryCoordinates, deliveryOption, vehicle]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pt-32 pb-20 flex justify-center items-center">
        <div className="animate-spin text-4xl">🛵</div>
      </div>
    );
  }

  if (error || !vehicle) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pt-32 pb-20 flex flex-col justify-center items-center">
        <h1 className="text-3xl font-bold mb-4">Oops!</h1>
        <p className="text-slate-500 mb-8">{error}</p>
        <Link to="/vehicles" className="px-6 py-3 bg-orange-500 text-white font-bold rounded-full">Back to Vehicles</Link>
      </div>
    );
  }

  const baseFare = vehicle.pricePerHour * durationHours;
  const platformFee = 5;
  const taxes = Math.round((baseFare + platformFee + deliveryCharge) * 0.18);
  const totalAmount = baseFare + platformFee + deliveryCharge + taxes;

  const isDeliveryValid = deliveryOption === 'self_pickup' || (deliveryOption === 'delivery' && deliveryCoordinates && !deliveryError);

  const handleWalletPayment = async (e) => {
    e.preventDefault();
    if (!isDeliveryValid) {
       setError('Please complete delivery details correctly before proceeding.');
       return;
    }
    if (walletBalance < totalAmount) {
       setError('Insufficient wallet balance. Please add funds or use Razorpay.');
       return;
    }
    setProcessing(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      if (!token) return setError('Please log in to book a vehicle');

      const verifyRes = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/bookings/pay-wallet`, {
        vehicleId: vehicle._id,
        durationHours,
        startDate: pickupDate,
        totalAmount,
        deliveryOption,
        deliveryAddress,
        deliveryCoordinates,
        deliveryCharge,
        deliveryDate: deliveryOption === 'delivery' ? pickupDate : undefined,
        pickupDate: deliveryOption === 'delivery' ? new Date(new Date(pickupDate).getTime() + durationHours * 3600000).toISOString() : undefined
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (verifyRes.status === 200) {
        if (verifyRes.data.autoConfirmed) {
          navigate('/dashboard/user?tab=bookings&confirmed=1');
        } else {
          navigate(`/dashboard/user?tab=bookings&pending=${verifyRes.data.bookingId}`);
        }
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Wallet payment failed');
    } finally {
      setProcessing(false);
    }
  };

  const handleRazorpayPayment = async (e) => {
    e.preventDefault();
    if (!isDeliveryValid) {
       setError('Please complete delivery details correctly before proceeding.');
       return;
    }
    setProcessing(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please log in to book a vehicle');
        setProcessing(false);
        return;
      }

      // 1. Create order on backend
      const orderRes = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/bookings/create-order`, {
        vehicleId: vehicle._id,
        durationHours,
        startDate: pickupDate,
        deliveryOption,
        deliveryCharge
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const { orderId, amount, currency } = orderRes.data;

      // 2. Initialize Razorpay options
      const options = {
        key: 'rzp_test_Snsc6Pg1LbIYVH', // User's test key
        amount: amount,
        currency: currency,
        name: "BikeRentLelo",
        description: `Booking for ${vehicle.name}`,
        order_id: orderId,
        handler: async function (response) {
          // 3. Verify Payment
          try {
            const verifyRes = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/bookings/verify-payment`, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              vehicleId: vehicle._id,
              durationHours,
              startDate: pickupDate,
              totalAmount,
              deliveryOption,
              deliveryAddress,
              deliveryCoordinates,
              deliveryCharge,
              deliveryDate: deliveryOption === 'delivery' ? pickupDate : undefined,
              pickupDate: deliveryOption === 'delivery' ? new Date(new Date(pickupDate).getTime() + durationHours * 3600000).toISOString() : undefined
            }, {
              headers: { Authorization: `Bearer ${token}` }
            });

            if (verifyRes.status === 200) {
              if (verifyRes.data.autoConfirmed) {
                navigate('/dashboard/user?tab=bookings&confirmed=1');
              } else {
                navigate(`/dashboard/user?tab=bookings&pending=${verifyRes.data.bookingId}`);
              }
            }
          } catch (err) {
            console.error('Verification Error:', err);
            setError(err.response?.data?.message || 'Payment verification failed');
          }
        },
        prefill: {
          name: "Test User",
          email: "test@example.com",
        },
        theme: {
          color: "#f97316" // Tailwind orange-500
        }
      };

      const rzp = new window.Razorpay(options);
      
      rzp.on('payment.failed', function (response){
        setError(`Payment Failed: ${response.error.description}`);
      });

      rzp.open();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to initialize payment');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pt-32 pb-20 selection:bg-orange-100 selection:text-orange-900 transition-colors duration-300">
      <div className="container mx-auto px-6 max-w-6xl">
        <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-10 tracking-tight">Complete your Booking</h1>
        
        {error && (
          <div className="mb-8 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl text-sm font-medium">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          
          <div className="space-y-6">
            {/* Delivery vs Pickup Toggle */}
            <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm transition-colors duration-300">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">How would you like to get it?</h2>
              <div className="flex gap-4">
                <button 
                  onClick={() => setDeliveryOption('self_pickup')}
                  className={`flex-1 flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all font-bold ${
                    deliveryOption === 'self_pickup' 
                    ? 'border-orange-500 bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-500' 
                    : 'border-zinc-200 dark:border-zinc-700 text-slate-500 hover:border-orange-300'
                  }`}
                >
                  <MapPin className="w-8 h-8 mb-2" />
                  Self Pickup
                  <span className="text-xs font-medium text-slate-400 mt-1">Pick it up yourself</span>
                </button>
                <button 
                  onClick={() => setDeliveryOption('delivery')}
                  className={`flex-1 flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all font-bold ${
                    deliveryOption === 'delivery' 
                    ? 'border-orange-500 bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-500' 
                    : 'border-zinc-200 dark:border-zinc-700 text-slate-500 hover:border-orange-300'
                  }`}
                >
                  <Truck className="w-8 h-8 mb-2" />
                  Delivery
                  <span className="text-xs font-medium text-slate-400 mt-1">Get it delivered</span>
                </button>
              </div>

              {/* Delivery Address & Map */}
              {deliveryOption === 'delivery' && (
                <div className="mt-8 space-y-4 animate-fade-in-up">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300">Delivery Address</label>
                      <button type="button" onClick={requestGPS} className="text-xs font-bold text-orange-500 hover:underline flex items-center gap-1">
                        {gpsLoading ? 'Getting GPS...' : '🎯 Use My GPS'}
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm"><Search className="w-4 h-4"/></span>
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleLocationSearch())}
                          placeholder="Search address or pin on map..."
                          className="w-full pl-9 pr-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleLocationSearch}
                        disabled={searching || !searchQuery.trim()}
                        className="px-4 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-xl hover:bg-orange-500 disabled:opacity-50 transition-colors text-sm"
                      >
                        {searching ? '...' : 'Search'}
                      </button>
                    </div>
                  </div>

                  <div className="h-48 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700 relative z-0">
                    <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%', zIndex: 0 }}>
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      <FlyTo center={mapCenter} />
                      <MapClickPicker onPick={handleMapClick} />
                      {deliveryCoordinates && <Marker position={[deliveryCoordinates.lat, deliveryCoordinates.lng]} />}
                    </MapContainer>
                  </div>
                  {deliveryCoordinates ? (
                    <div className="flex justify-between items-center text-sm font-bold text-emerald-600 dark:text-emerald-400">
                      <span>✅ Address selected</span>
                      {osrmDistance && <span>{osrmDistance} km from vehicle</span>}
                    </div>
                  ) : (
                    <p className="text-sm font-bold text-amber-500">Please select a delivery location on the map</p>
                  )}

                  {deliveryError && (
                    <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm font-bold mt-2">
                      {deliveryError}
                    </div>
                  )}

                </div>
              )}
            </div>
            
            {/* Rental Duration Details */}
            <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm transition-colors duration-300">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Rental Details</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300 mb-2">Duration</label>
                  <div className="flex items-center bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3">
                    <Clock className="w-5 h-5 text-slate-400 mr-2 shrink-0" />
                    <select 
                      value={durationHours}
                      onChange={(e) => setDurationHours(Number(e.target.value))}
                      className="bg-transparent text-slate-900 dark:text-white font-medium focus:outline-none w-full"
                    >
                      <option value="1" className="text-black">1 Hour</option>
                      <option value="2" className="text-black">2 Hours</option>
                      <option value="5" className="text-black">5 Hours</option>
                      <option value="12" className="text-black">12 Hours</option>
                      <option value="24" className="text-black">24 Hours</option>
                      <option value="48" className="text-black">48 Hours</option>
                      <option value="168" className="text-black">7 Days</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300 mb-2">Start Time</label>
                  <input 
                    type="datetime-local" 
                    value={pickupDate}
                    onChange={(e) => setPickupDate(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 font-medium focus:outline-none focus:border-orange-500 text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Order Summary */}
            <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm transition-colors duration-300">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Order Summary</h2>
              
              <div className="flex items-center space-x-4 mb-6 pb-6 border-b border-zinc-100 dark:border-zinc-800">
                <div 
                  className="w-16 h-16 bg-zinc-50 dark:bg-zinc-800 rounded-xl flex items-center justify-center border border-zinc-200 dark:border-zinc-700 bg-cover bg-center"
                  style={{ backgroundImage: vehicle.imageUrl ? `url(${vehicle.imageUrl})` : 'none' }}
                >
                  {!vehicle.imageUrl && <span className="text-3xl">🛵</span>}
                </div>
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white">{vehicle.name}</h3>
                  <p className="text-sm font-medium text-slate-500 dark:text-zinc-400 mt-1">₹{vehicle.pricePerHour} / hr • {vehicle.type}</p>
                </div>
              </div>

              <div className="space-y-4 text-sm font-bold text-slate-500 dark:text-zinc-400">
                <div className="flex justify-between">
                  <span>Base Fare ({durationHours} hr)</span>
                  <span>₹{baseFare}</span>
                </div>
                <div className="flex justify-between">
                  <span>Platform Fee</span>
                  <span>₹{platformFee}</span>
                </div>
                {deliveryOption === 'delivery' && (
                  <div className="flex justify-between text-orange-600 dark:text-orange-500">
                    <span>Delivery Fee ({osrmDistance ? `${osrmDistance}km` : 'calculating...'})</span>
                    <span>₹{deliveryCharge}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Taxes (18% GST)</span>
                  <span>₹{taxes}</span>
                </div>
              </div>

              <div className="border-t border-zinc-100 dark:border-zinc-800 pt-6 mt-6 flex justify-between text-xl font-black text-slate-900 dark:text-white">
                <span>Total Amount</span>
                <span>₹{totalAmount}</span>
              </div>
            </div>

            {/* Payment Method */}
            <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm transition-colors duration-300">
              <div className="flex items-center space-x-3 mb-6">
                <CreditCard className="w-6 h-6 text-orange-500" />
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Payment Method</h2>
              </div>
              
              <div className="flex flex-col gap-3 mb-6">
                <label className={`flex items-center p-4 border-2 rounded-2xl cursor-pointer transition-colors ${paymentMethod === 'razorpay' ? 'border-orange-500 bg-orange-50 dark:bg-orange-500/10' : 'border-zinc-200 dark:border-zinc-700 hover:border-orange-300'}`}>
                  <input type="radio" name="paymentMethod" value="razorpay" checked={paymentMethod === 'razorpay'} onChange={() => setPaymentMethod('razorpay')} className="mr-3" />
                  <div className="flex items-center gap-2">
                    <img src="https://razorpay.com/assets/razorpay-logo.svg" alt="Razorpay" className="h-5 filter grayscale dark:invert opacity-70" />
                    <span className="font-bold text-slate-900 dark:text-white">Razorpay</span>
                  </div>
                </label>
                <label className={`flex items-center p-4 border-2 rounded-2xl cursor-pointer transition-colors ${paymentMethod === 'wallet' ? 'border-orange-500 bg-orange-50 dark:bg-orange-500/10' : 'border-zinc-200 dark:border-zinc-700 hover:border-orange-300'}`}>
                  <input type="radio" name="paymentMethod" value="wallet" checked={paymentMethod === 'wallet'} onChange={() => setPaymentMethod('wallet')} className="mr-3" />
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-900 dark:text-white">Pay from Wallet</span>
                    <span className="text-xs font-semibold text-slate-500">Available Balance: ₹{walletBalance.toFixed(2)}</span>
                  </div>
                </label>
              </div>

              {paymentMethod === 'razorpay' && (
                <div className="bg-orange-50 dark:bg-orange-500/10 p-4 rounded-xl flex items-start space-x-3 mb-6">
                  <CheckCircle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                  <p className="text-sm font-medium text-slate-700 dark:text-zinc-300">
                    Your payment is secure and encrypted.
                  </p>
                </div>
              )}

              {paymentMethod === 'wallet' && walletBalance < totalAmount && (
                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl flex items-start space-x-3 mb-6">
                  <p className="text-sm font-bold text-red-600 dark:text-red-400">
                    Insufficient balance. Please add funds to your wallet or use Razorpay.
                  </p>
                </div>
              )}

              <button 
                onClick={paymentMethod === 'wallet' ? handleWalletPayment : handleRazorpayPayment} 
                disabled={processing || !isDeliveryValid || (paymentMethod === 'wallet' && walletBalance < totalAmount)}
                className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-full hover:bg-orange-500 dark:hover:bg-orange-500 dark:hover:text-white transition-colors shadow-lg disabled:opacity-50"
              >
                {processing ? 'Processing...' : `Pay ₹${totalAmount} & Book`}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default BookingFlow;
