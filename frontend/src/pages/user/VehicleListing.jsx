import { useState, useEffect } from 'react';
import { Search, Filter, MapPin, Battery, Star, ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const VehicleListing = () => {
  const [allVehicles, setAllVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // AI Recommendation State
  const [aiQuery, setAiQuery] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMessage, setAiMessage] = useState(null);
  const [aiRecommendedIds, setAiRecommendedIds] = useState([]);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    electric: false,
    motorbike: false,
    maxPrice: 500  // Default to slider max so all vehicles show initially
  });

  const PRICE_MAX = 500;

  useEffect(() => {
    const fetchAllVehicles = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/vehicles`, {
          timeout: 10000
        });
        setAllVehicles(res.data);
      } catch (err) {
        console.error(err);
        setError(err.code === 'ECONNABORTED' ? 'Request timed out. Is the server running?' : 'Failed to load vehicles. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchAllVehicles();
  }, []);

  const handleFilterChange = (e) => {
    const { name, checked, value, type } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
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

  const clearAiRecommendation = () => {
    setAiQuery('');
    setAiMessage(null);
    setAiRecommendedIds([]);
  };

  // Filter vehicles locally
  let displayedVehicles = allVehicles.filter(v => {
    // 1. Filter by AI Recommendations if active
    if (aiRecommendedIds.length > 0 && !aiRecommendedIds.includes(v._id)) return false;

    // 2. Filter by Vehicle Type
    const types = [];
    if (filters.electric) types.push('Electric Scooter');
    if (filters.motorbike) types.push('Motorbike');
    if (types.length > 0 && !types.includes(v.type)) return false;

    // 3. Filter by Max Price
    if (filters.maxPrice < PRICE_MAX && v.pricePerHour > filters.maxPrice) return false;

    // 4. Filter by Search Query
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      const nameMatch = v.name.toLowerCase().includes(searchLower);
      const locationMatch = v.location && v.location.toLowerCase().includes(searchLower);
      if (!nameMatch && !locationMatch) return false;
    }

    return true;
  });

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pt-28 pb-20 selection:bg-orange-100 selection:text-orange-900 transition-colors duration-300">
      <div className="container mx-auto px-6">
        
        {/* Search & Filter Header */}
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm mb-8 flex flex-col md:flex-row gap-4 items-center justify-between transition-colors duration-300">
          <div className="flex-1 w-full relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Search by location or vehicle name..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl focus:bg-white dark:focus:bg-zinc-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
            />
          </div>
          <button className="w-full md:w-auto px-6 py-4 bg-zinc-100 dark:bg-zinc-800 text-slate-900 dark:text-white font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
            <Filter className="w-5 h-5" /> Filters
          </button>
        </div>

        {/* AI Recommendation Banner */}
        <div className="bg-gradient-to-r from-orange-500 to-rose-500 rounded-3xl p-6 md:p-8 mb-8 shadow-lg text-white flex flex-col md:flex-row items-center gap-6 justify-between">
          <div className="flex-1">
            <h3 className="text-2xl font-black mb-2 flex items-center gap-2">✨ Ask AI for a Recommendation</h3>
            <p className="font-medium opacity-90 mb-4">Not sure what to rent? Describe your trip and let AI find the perfect ride for you.</p>
            {aiMessage && (
              <div className="bg-white/20 p-4 rounded-xl border border-white/30 backdrop-blur-sm mb-4">
                <p className="font-bold">{aiMessage}</p>
                <button onClick={clearAiRecommendation} className="mt-2 text-sm underline hover:text-white/80">Clear Recommendation</button>
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

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Filters */}
          <div className="w-full lg:w-1/4">
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm sticky top-28 transition-colors duration-300">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Filter By</h3>
              
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-bold text-slate-500 dark:text-zinc-400 mb-3 uppercase tracking-wider">Vehicle Type</h4>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-3 text-slate-700 dark:text-zinc-300 font-medium">
                      <input 
                        type="checkbox" 
                        name="electric"
                        checked={filters.electric}
                        onChange={handleFilterChange}
                        className="w-4 h-4 rounded text-orange-500 focus:ring-orange-500" 
                      />
                      <span>Electric Scooters</span>
                    </label>
                    <label className="flex items-center space-x-3 text-slate-700 dark:text-zinc-300 font-medium">
                      <input 
                        type="checkbox" 
                        name="motorbike"
                        checked={filters.motorbike}
                        onChange={handleFilterChange}
                        className="w-4 h-4 rounded text-orange-500 focus:ring-orange-500" 
                      />
                      <span>Motorbikes</span>
                    </label>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-slate-500 dark:text-zinc-400 mb-3 uppercase tracking-wider flex justify-between">
                    <span>Max Price/Hr</span>
                    <span className="text-orange-500">₹{filters.maxPrice}</span>
                  </h4>
                  <input 
                    type="range" 
                    name="maxPrice"
                    min="10" 
                    max="500" 
                    value={filters.maxPrice}
                    onChange={handleFilterChange}
                    className="w-full accent-orange-500" 
                  />
                  <div className="flex justify-between text-xs font-bold text-slate-500 mt-2">
                    <span>₹10/hr</span>
                    <span>{filters.maxPrice < 500 ? `₹${filters.maxPrice}/hr max` : 'Any price'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Listing Grid */}
          <div className="w-full lg:w-3/4">
            <div className="mb-6 flex justify-between items-center">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">Available Vehicles</h2>
              <button className="flex items-center space-x-2 text-sm font-bold text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                <span>Sort by: Recommended</span>
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>

            {error && <div className="text-red-500 font-bold mb-4">{error}</div>}
            
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {/* Skeleton Loading */}
                 {[1, 2, 3, 4].map(n => (
                   <div key={n} className="bg-zinc-200 dark:bg-zinc-800 animate-pulse rounded-[2rem] h-80"></div>
                 ))}
              </div>
            ) : displayedVehicles.length === 0 ? (
              <div className="text-center py-20 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800">
                <span className="text-4xl mb-4 block">🔍</span>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No vehicles found</h3>
                <p className="text-slate-500 dark:text-zinc-400 font-medium">Try adjusting your filters or searching for something else.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {displayedVehicles.map(vehicle => (
                  <VehicleCard 
                    key={vehicle._id}
                    id={vehicle._id} 
                    name={vehicle.name} 
                    type={vehicle.type} 
                    price={vehicle.pricePerHour} 
                    range={vehicle.range} 
                    location={vehicle.location}
                    rating={vehicle.rating}
                    imageUrl={vehicle.imageUrl}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

const VehicleCard = ({ id, name, type, price, range, location, rating, imageUrl }) => (
  <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] p-6 shadow-sm hover:shadow-xl transition-all duration-300">
    <div 
      className="bg-zinc-50 dark:bg-zinc-800 rounded-2xl h-48 mb-6 bg-cover bg-center border border-zinc-100 dark:border-zinc-700"
      style={{ backgroundImage: `url(${imageUrl})` }}
    >
      {/* If no image, fallback to emoji */}
      {!imageUrl && <div className="w-full h-full flex items-center justify-center"><span className="text-6xl">🛵</span></div>}
    </div>
    
    <div className="flex justify-between items-start mb-4">
      <div>
        <h3 className="text-xl font-black text-slate-900 dark:text-white">{name}</h3>
        <p className="text-sm font-medium text-slate-500 dark:text-zinc-400">{type}</p>
      </div>
      <div className="flex items-center bg-orange-50 dark:bg-orange-500/10 px-2 py-1 rounded-lg text-orange-500 font-bold text-xs">
        <Star className="w-3 h-3 fill-current mr-1" /> {rating}
      </div>
    </div>
    
    <div className="flex gap-2 mb-6">
      <div className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2 py-1.5 flex items-center space-x-1 text-xs font-bold text-slate-600 dark:text-zinc-300 truncate max-w-[50%]">
        <Battery className="w-3 h-3 text-emerald-500 flex-shrink-0" />
        <span className="truncate">{range}</span>
      </div>
      <div className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2 py-1.5 flex items-center space-x-1 text-xs font-bold text-slate-600 dark:text-zinc-300 truncate max-w-[50%]">
        <MapPin className="w-3 h-3 text-blue-500 flex-shrink-0" />
        <span className="truncate">{location}</span>
      </div>
    </div>
    
    <div className="flex items-center justify-between mt-auto">
      <div className="flex items-baseline">
        <span className="text-2xl font-black text-slate-900 dark:text-white">₹{price}</span>
        <span className="text-slate-500 dark:text-zinc-400 font-semibold ml-1 text-sm">/hr</span>
      </div>
      <Link to={`/vehicles/${id}`} className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-5 py-2.5 rounded-xl font-bold shadow-md hover:bg-orange-500 dark:hover:bg-orange-500 dark:hover:text-white transition-colors">
        View Details
      </Link>
    </div>
  </div>
);

export default VehicleListing;
