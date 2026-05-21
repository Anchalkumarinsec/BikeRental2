import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { CreditCard, CheckCircle, Clock } from 'lucide-react';
import axios from 'axios';

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
        const res = await axios.get(`${import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}`}/api/vehicles/${id}`);
        setVehicle(res.data);
      } catch (err) {
        console.error(err);
        setError('Vehicle not found');
      } finally {
        setLoading(false);
      }
    };
    fetchVehicle();
  }, [id]);

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
  const taxes = Math.round((baseFare + platformFee) * 0.18);
  const totalAmount = baseFare + platformFee + taxes;

  const handlePayment = async (e) => {
    e.preventDefault();
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
        startDate: pickupDate
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
              totalAmount
            }, {
              headers: { Authorization: `Bearer ${token}` }
            });

            if (verifyRes.status === 200) {
              if (verifyRes.data.autoConfirmed) {
                // Instant confirmation — go to dashboard
                navigate('/dashboard/user?tab=bookings&confirmed=1');
              } else {
                // Manual approval — show waiting screen
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
      <div className="container mx-auto px-6 max-w-4xl">
        <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-10 tracking-tight">Complete your Booking</h1>
        
        {error && (
          <div className="mb-8 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl text-sm font-medium">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* Order Summary */}
          <div>
            <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm mb-6 transition-colors duration-300">
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
                  <div className="flex flex-col space-y-2 text-sm font-medium text-slate-500 dark:text-zinc-400 mt-2">
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-2" />
                      <select 
                        value={durationHours}
                        onChange={(e) => setDurationHours(Number(e.target.value))}
                        className="bg-transparent border-b border-zinc-300 dark:border-zinc-700 focus:outline-none focus:border-orange-500"
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
                    <div className="flex items-center">
                      <span className="mr-2">Starts:</span>
                      <input 
                        type="datetime-local" 
                        value={pickupDate}
                        onChange={(e) => setPickupDate(e.target.value)}
                        className="bg-transparent font-medium focus:outline-none border-b border-zinc-300 dark:border-zinc-700 focus:border-orange-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4 text-sm font-bold text-slate-500 dark:text-zinc-400">
                <div className="flex justify-between">
                  <span>Base Fare ({durationHours} hr x ₹{vehicle.pricePerHour})</span>
                  <span>₹{baseFare}</span>
                </div>
                <div className="flex justify-between">
                  <span>Platform Fee</span>
                  <span>₹{platformFee}</span>
                </div>
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
          </div>

          {/* Payment Method */}
          <div>
            <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm transition-colors duration-300">
              <div className="flex items-center space-x-3 mb-6">
                <img src="https://razorpay.com/assets/razorpay-logo.svg" alt="Razorpay" className="h-6 filter grayscale dark:invert opacity-70" />
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Payment</h2>
              </div>
              
              <div className="space-y-6">
                <p className="text-sm font-medium text-slate-500 dark:text-zinc-400 mb-6">
                  You will be securely redirected to Razorpay to complete your payment via UPI, Credit Card, or Netbanking.
                </p>

                <div className="bg-orange-50 dark:bg-orange-500/10 p-4 rounded-xl flex items-start space-x-3 mt-6">
                  <CheckCircle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                  <p className="text-sm font-medium text-slate-700 dark:text-zinc-300">
                    Your payment is secure and encrypted. You can cancel for free up to 2 hours before the ride.
                  </p>
                </div>

                <button 
                  onClick={handlePayment} 
                  disabled={processing}
                  className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-full hover:bg-orange-500 dark:hover:bg-orange-500 dark:hover:text-white transition-colors shadow-lg mt-8 disabled:opacity-50"
                >
                  {processing ? 'Connecting to Razorpay...' : `Pay ₹${totalAmount} & Book`}
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default BookingFlow;
