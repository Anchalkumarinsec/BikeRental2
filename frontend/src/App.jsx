import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import UserDashboard from './pages/dashboards/UserDashboard';
import LenderDashboard from './pages/dashboards/LenderDashboard';
import AdminDashboard from './pages/dashboards/AdminDashboard';
import DeliveryAgentDashboard from './pages/dashboards/DeliveryAgentDashboard';
import VehicleListing from './pages/user/VehicleListing';
import VehicleDetails from './pages/user/VehicleDetails';
import BookingFlow from './pages/user/BookingFlow';
import BookingTracking from './pages/user/BookingTracking';
import { ThemeProvider } from './contexts/ThemeContext';
import { NotificationProvider } from './contexts/NotificationContext';
import AIChatWidget from './components/AIChatWidget';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  return (
    <ThemeProvider>
      <Router>
        <NotificationProvider>
          <div className="flex flex-col min-h-screen">
            <Navbar />
          <main className="flex-grow">
            <ErrorBoundary>
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/dashboard/user" element={<UserDashboard />} />
                <Route path="/dashboard/lender" element={<LenderDashboard />} />
                <Route path="/dashboard/admin" element={<AdminDashboard />} />
                <Route path="/dashboard/delivery-agent" element={<DeliveryAgentDashboard />} />
                <Route path="/vehicles" element={<VehicleListing />} />
                <Route path="/vehicles/:id" element={<VehicleDetails />} />
                <Route path="/book/:id" element={<BookingFlow />} />
                <Route path="/track/:bookingId" element={<BookingTracking />} />
                <Route path="/tracking/:bookingId" element={<BookingTracking />} />
              </Routes>
            </ErrorBoundary>
          </main>
            <AIChatWidget />
          </div>
        </NotificationProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;
