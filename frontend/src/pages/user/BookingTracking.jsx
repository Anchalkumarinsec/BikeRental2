import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, Navigation, Clock, AlertTriangle, Play, Pause, RotateCcw, ExternalLink, Footprints, ArrowLeft } from 'lucide-react';
import axios from 'axios';
import { useNotification } from '../../contexts/NotificationContext';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const vehicleIcon = new L.DivIcon({
  html: `<div style="background:#f97316;width:40px;height:40px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center"><span style="transform:rotate(45deg);font-size:18px">🛵</span></div>`,
  className: '', iconSize: [40, 40], iconAnchor: [20, 40], popupAnchor: [0, -40],
});

const userIcon = new L.DivIcon({
  html: `<div style="width:22px;height:22px;background:#3b82f6;border:3px solid white;border-radius:50%;box-shadow:0 0 0 6px rgba(59,130,246,0.25)"></div>`,
  className: '', iconSize: [22, 22], iconAnchor: [11, 11],
});

const replayDot = new L.DivIcon({
  html: `<div style="width:16px;height:16px;background:#f97316;border:3px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>`,
  className: '', iconSize: [16, 16], iconAnchor: [8, 8],
});

const haversineKm = (lat1, lng1, lat2, lng2) => {
  const R = 6371, dLat = (lat2 - lat1) * Math.PI / 180, dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const FlyTo = ({ center }) => { const map = useMap(); useEffect(() => { if (center) map.flyTo(center, 15, { duration: 1.2 }); }, [center]); return null; };

const BookingTracking = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [view, setView] = useState('navigate'); // 'navigate' | 'live' | 'replay'

  const [vehicleCoords, setVehicleCoords] = useState(null);
  const [userCoords, setUserCoords] = useState(null);
  const [walkingRoute, setWalkingRoute] = useState(null);
  const [walkingInfo, setWalkingInfo] = useState(null);
  const [rideTrail, setRideTrail] = useState([]);
  const [liveSpeed, setLiveSpeed] = useState(0);
  const [rideDistanceKm, setRideDistanceKm] = useState(0);
  const [replayHistory, setReplayHistory] = useState([]);
  const [replayIdx, setReplayIdx] = useState(0);
  const [replayPlaying, setReplayPlaying] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState('--:--:--');
  const [isExpired, setIsExpired] = useState(false);
  const [flyTarget, setFlyTarget] = useState(null);

  const { socket } = useNotification();
  const watchRef = useRef(null);
  const postIntervalRef = useRef(null);
  const replayTimerRef = useRef(null);
  const latestCoordsRef = useRef(null);
  const prevCoordsRef = useRef(null);

  // ── Fetch booking ──
  useEffect(() => {
    const fetch = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}`}/api/bookings/${bookingId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const bk = res.data;
        setBooking(bk);
        if (bk.status === 'completed') { setView('replay'); fetchReplay(); }

        if (bk.vehicle?.locationCoordinates?.lat) {
          const c = [bk.vehicle.locationCoordinates.lat, bk.vehicle.locationCoordinates.lng];
          setVehicleCoords(c); setFlyTarget(c);
        } else if (bk.vehicle?.location) {
          geocode(bk.vehicle.location);
        } else {
          setVehicleCoords([28.6139, 77.2090]);
        }
      } catch { setError('Failed to load booking details.'); }
      finally { setLoading(false); }
    };
    fetch();
    return () => cleanup();
  }, [bookingId]);

  const geocode = async (text) => {
    try {
      const r = await axios.get(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(text)}`);
      const c = r.data?.[0] ? [parseFloat(r.data[0].lat), parseFloat(r.data[0].lon)] : [28.6139, 77.2090];
      setVehicleCoords(c); setFlyTarget(c);
    } catch { setVehicleCoords([28.6139, 77.2090]); }
  };

  // ── GPS watch ──
  useEffect(() => {
    if (!navigator.geolocation) return;
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const c = [pos.coords.latitude, pos.coords.longitude];
        setUserCoords(c); latestCoordsRef.current = c;
        if (pos.coords.speed !== null) setLiveSpeed(Math.round(pos.coords.speed * 3.6));
      },
      (e) => console.error(e),
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
    );
    return () => navigator.geolocation.clearWatch(watchRef.current);
  }, []);

  // ── OSRM walking route ──
  useEffect(() => {
    if (userCoords && vehicleCoords && view === 'navigate') {
      fetchWalkingRoute(userCoords, vehicleCoords);
    }
  }, [userCoords, vehicleCoords, view]);

  const fetchWalkingRoute = async (from, to) => {
    try {
      const url = `https://router.project-osrm.org/route/v1/foot/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`;
      const r = await axios.get(url);
      if (r.data.routes?.[0]) {
        const route = r.data.routes[0];
        setWalkingRoute(route.geometry.coordinates.map(([lng, lat]) => [lat, lng]));
        setWalkingInfo({ distanceM: route.distance, durationSec: route.duration });
      }
    } catch { /* OSRM may rate-limit, fail silently */ }
  };

  // ── POST location to backend every 5s during active ride ──
  useEffect(() => {
    if (!booking || booking.status !== 'confirmed') return;
    const token = localStorage.getItem('token');
    postIntervalRef.current = setInterval(() => {
      const c = latestCoordsRef.current;
      if (!c) return;
      axios.put(`${import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}`}/api/bookings/${bookingId}/live-location`,
        { lat: c[0], lng: c[1], speed: liveSpeed },
        { headers: { Authorization: `Bearer ${token}` } }
      ).catch(() => {});
      setRideTrail(prev => [...prev, c]);
      if (prevCoordsRef.current) {
        const d = haversineKm(prevCoordsRef.current[0], prevCoordsRef.current[1], c[0], c[1]);
        setRideDistanceKm(prev => +(prev + d).toFixed(2));
      }
      prevCoordsRef.current = c;
    }, 5000);
    return () => clearInterval(postIntervalRef.current);
  }, [booking, bookingId, liveSpeed]);

  // ── Socket.IO ──
  useEffect(() => {
    if (!socket) return;
    socket.emit('join-booking-room', bookingId);
    // Note: We don't disconnect the socket here because it's shared globally
  }, [bookingId, socket]);

  // ── Ride timer ──
  useEffect(() => {
    if (!booking) return;
    const t = setInterval(() => {
      const start = new Date(booking.startDate).getTime();
      const end = start + booking.durationHours * 3600000;
      const now = Date.now();
      if (now > end) { setIsExpired(true); setTimeRemaining('Expired'); clearInterval(t); }
      else if (now < start) setTimeRemaining('Not Started');
      else {
        const d = end - now;
        setTimeRemaining(`${String(Math.floor(d / 3600000)).padStart(2, '0')}:${String(Math.floor((d % 3600000) / 60000)).padStart(2, '0')}:${String(Math.floor((d % 60000) / 1000)).padStart(2, '0')}`);
      }
    }, 1000);
    return () => clearInterval(t);
  }, [booking]);

  // ── Route Replay ──
  const fetchReplay = async () => {
    try {
      const token = localStorage.getItem('token');
      const r = await axios.get(`${import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}`}/api/bookings/${bookingId}/route`, { headers: { Authorization: `Bearer ${token}` } });
      if (r.data.routeHistory?.length > 0) {
        setReplayHistory(r.data.routeHistory.map(p => [p.lat, p.lng]));
      }
    } catch { /* no replay data */ }
  };

  const startReplay = () => {
    setReplayPlaying(true);
    replayTimerRef.current = setInterval(() => {
      setReplayIdx(prev => {
        if (prev >= replayHistory.length - 1) { clearInterval(replayTimerRef.current); setReplayPlaying(false); return prev; }
        return prev + 1;
      });
    }, 80);
  };
  const pauseReplay = () => { setReplayPlaying(false); clearInterval(replayTimerRef.current); };
  const resetReplay = () => { pauseReplay(); setReplayIdx(0); };

  const cleanup = () => {
    if (watchRef.current) navigator.geolocation.clearWatch(watchRef.current);
    clearInterval(postIntervalRef.current);
    clearInterval(replayTimerRef.current);
  };

  const openGoogleMaps = () => {
    if (!vehicleCoords) return;
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${vehicleCoords[0]},${vehicleCoords[1]}&travelmode=walking`, '_blank');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 text-slate-900 dark:text-white font-bold text-xl pt-20">Loading Tracking Data...</div>;
  if (error || !booking) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 pt-20">
      <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{error || 'Booking not found'}</h2>
      <button onClick={() => navigate(-1)} className="mt-6 px-6 py-3 bg-slate-900 text-white rounded-full font-bold">Go Back</button>
    </div>
  );

  const dist = (m) => m < 1000 ? `${Math.round(m)}m` : `${(m / 1000).toFixed(1)}km`;
  const dur = (s) => s < 60 ? `${Math.round(s)}s` : `${Math.round(s / 60)} min`;
  const mapCenter = userCoords || vehicleCoords || [28.6139, 77.2090];

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pt-28 pb-20">
      <div className="container mx-auto px-6 max-w-7xl">

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard/user')}
              className="flex items-center justify-center w-10 h-10 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm hover:bg-orange-50 dark:hover:bg-zinc-800 hover:border-orange-300 text-slate-600 dark:text-zinc-400 hover:text-orange-500 transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {view === 'replay' ? '🔁 Ride Replay' : view === 'live' ? '🔴 Live Tracking' : '🗺️ Navigate to Vehicle'}
              </h1>
              <p className="text-sm font-bold text-slate-500 dark:text-zinc-400 mt-1">
                {booking.vehicle?.name} • #{booking._id.slice(-6).toUpperCase()}
              </p>
            </div>
          </div>
          {booking.status === 'confirmed' && (
            <div className="flex bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-1 gap-1">
              {['navigate', 'live'].map(v => (
                <button key={v} onClick={() => setView(v)}
                  className={`px-4 py-2 rounded-xl font-bold text-sm capitalize transition-all ${view === v ? 'bg-orange-500 text-white shadow' : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'}`}>
                  {v === 'navigate' ? '🚶 Navigate' : '📍 Live Trail'}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* MAP */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm h-[520px] overflow-hidden relative z-0">
              <MapContainer center={mapCenter} zoom={14} style={{ height: '100%', width: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
                {flyTarget && <FlyTo center={flyTarget} />}

                {/* Vehicle pin */}
                {vehicleCoords && view !== 'replay' && (
                  <Marker position={vehicleCoords} icon={vehicleIcon}>
                    <Popup><strong>{booking.vehicle?.name}</strong><br />Pickup location</Popup>
                  </Marker>
                )}

                {/* User GPS dot */}
                {userCoords && view !== 'replay' && (
                  <Marker position={userCoords} icon={userIcon}>
                    <Popup>Your location</Popup>
                  </Marker>
                )}

                {/* Walking route (navigation mode) */}
                {view === 'navigate' && walkingRoute && (
                  <Polyline positions={walkingRoute} color="#3b82f6" weight={5} dashArray="12 8" opacity={0.8} />
                )}

                {/* Live ride trail */}
                {view === 'live' && rideTrail.length > 1 && (
                  <Polyline positions={rideTrail} color="#f97316" weight={5} opacity={0.9} />
                )}

                {/* Replay: full route + animated dot */}
                {view === 'replay' && replayHistory.length > 1 && (
                  <>
                    <Polyline positions={replayHistory} color="#94a3b8" weight={4} opacity={0.5} />
                    <Polyline positions={replayHistory.slice(0, replayIdx + 1)} color="#f97316" weight={5} opacity={0.9} />
                    {replayHistory[replayIdx] && (
                      <Marker position={replayHistory[replayIdx]} icon={replayDot} />
                    )}
                    {/* Start / End markers */}
                    <Marker position={replayHistory[0]}>
                      <Popup>🟢 Ride Start</Popup>
                    </Marker>
                    <Marker position={replayHistory[replayHistory.length - 1]}>
                      <Popup>🏁 Ride End</Popup>
                    </Marker>
                  </>
                )}
              </MapContainer>

              {/* Map overlay: time remaining */}
              <div className="absolute top-4 left-4 z-[400] bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm px-4 py-3 rounded-2xl shadow border border-zinc-200 dark:border-zinc-700 pointer-events-none">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Time Remaining</p>
                <p className={`text-xl font-black ${isExpired ? 'text-red-500' : 'text-slate-900 dark:text-white'}`}>{timeRemaining}</p>
              </div>

              {/* Navigate overlay: walking info */}
              {view === 'navigate' && walkingInfo && (
                <div className="absolute top-4 right-4 z-[400] bg-blue-500 text-white px-4 py-3 rounded-2xl shadow-lg">
                  <p className="text-xs font-bold uppercase tracking-wider opacity-80">Walking</p>
                  <p className="text-lg font-black">{dist(walkingInfo.distanceM)}</p>
                  <p className="text-sm font-bold opacity-90">~{dur(walkingInfo.durationSec)}</p>
                </div>
              )}

              {/* Live speed badge */}
              {view === 'live' && (
                <div className="absolute top-4 right-4 z-[400] bg-orange-500 text-white px-4 py-3 rounded-2xl shadow-lg text-center">
                  <p className="text-2xl font-black">{liveSpeed}</p>
                  <p className="text-xs font-bold opacity-80">km/h</p>
                </div>
              )}
            </div>
          </div>

          {/* SIDEBAR */}
          <div className="space-y-4">
            {/* Vehicle card */}
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-3xl border border-zinc-200 dark:border-zinc-700 bg-cover bg-center shrink-0"
                  style={{ backgroundImage: booking.vehicle?.imageUrl ? `url(http://localhost:5000${booking.vehicle.imageUrl})` : 'none' }}>
                  {!booking.vehicle?.imageUrl && '🛵'}
                </div>
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white">{booking.vehicle?.name}</h3>
                  <p className="text-sm text-slate-500 dark:text-zinc-400 font-medium">₹{booking.totalAmount} total</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-orange-500 shrink-0" />
                <p className="text-sm font-bold text-slate-600 dark:text-zinc-300">{booking.vehicle?.location}</p>
              </div>
            </div>

            {/* Navigation panel */}
            {view === 'navigate' && (
              <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
                <h3 className="font-black text-slate-900 dark:text-white flex items-center gap-2"><Footprints className="w-5 h-5 text-blue-500" /> Walk to Bike</h3>
                {walkingInfo ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-blue-50 dark:bg-blue-500/10 p-4 rounded-2xl text-center">
                      <p className="text-2xl font-black text-blue-600 dark:text-blue-400">{dist(walkingInfo.distanceM)}</p>
                      <p className="text-xs font-bold text-slate-500 mt-1">Distance</p>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-500/10 p-4 rounded-2xl text-center">
                      <p className="text-2xl font-black text-blue-600 dark:text-blue-400">{dur(walkingInfo.durationSec)}</p>
                      <p className="text-xs font-bold text-slate-500 mt-1">Est. Walk</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 font-medium">{userCoords ? 'Calculating route...' : 'Allow GPS to get walking directions'}</p>
                )}
                <button onClick={openGoogleMaps} className="w-full flex items-center justify-center gap-2 py-3 bg-blue-500 text-white font-bold rounded-xl hover:bg-blue-600 transition-colors">
                  <Navigation className="w-4 h-4" /> Open in Google Maps <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Live stats */}
            {view === 'live' && (
              <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
                <h3 className="font-black text-slate-900 dark:text-white">📍 Live Stats</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-orange-50 dark:bg-orange-500/10 p-4 rounded-2xl text-center">
                    <p className="text-2xl font-black text-orange-500">{liveSpeed}</p>
                    <p className="text-xs font-bold text-slate-500 mt-1">km/h Speed</p>
                  </div>
                  <div className="bg-orange-50 dark:bg-orange-500/10 p-4 rounded-2xl text-center">
                    <p className="text-2xl font-black text-orange-500">{rideDistanceKm}</p>
                    <p className="text-xs font-bold text-slate-500 mt-1">km Ridden</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                  <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">GPS tracking active</p>
                </div>
              </div>
            )}

            {/* Replay controls */}
            {view === 'replay' && (
              <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
                <h3 className="font-black text-slate-900 dark:text-white">🔁 Route Replay</h3>
                {replayHistory.length > 0 ? (
                  <>
                    <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-2">
                      <div className="bg-orange-500 h-2 rounded-full transition-all" style={{ width: `${(replayIdx / (replayHistory.length - 1)) * 100}%` }} />
                    </div>
                    <p className="text-xs text-slate-500 font-bold text-center">{replayIdx + 1} / {replayHistory.length} points</p>
                    <div className="flex gap-2">
                      <button onClick={resetReplay} className="flex-1 py-3 bg-zinc-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-bold rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors flex items-center justify-center gap-2">
                        <RotateCcw className="w-4 h-4" /> Reset
                      </button>
                      {replayPlaying ? (
                        <button onClick={pauseReplay} className="flex-1 py-3 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 transition-colors flex items-center justify-center gap-2">
                          <Pause className="w-4 h-4" /> Pause
                        </button>
                      ) : (
                        <button onClick={startReplay} className="flex-1 py-3 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 transition-colors flex items-center justify-center gap-2">
                          <Play className="w-4 h-4" /> Play
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-slate-400 font-medium text-center py-4">No route data was recorded for this ride.</p>
                )}
              </div>
            )}

            {/* Quick info */}
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-orange-500" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase">Start Time</p>
                  <p className="font-bold text-slate-900 dark:text-white text-sm">{new Date(booking.startDate).toLocaleString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-blue-500" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase">Duration</p>
                  <p className="font-bold text-slate-900 dark:text-white text-sm">{booking.durationHours} Hours</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingTracking;
