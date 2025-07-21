import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Tickets from './pages/Tickets';
import TicketDetail from './pages/TicketDetail';
import Employees from './pages/Employees';
import Email from './pages/Email';
import CustomData from './pages/CustomData';
import Profile from './pages/Profile';
import LoadingOverlay from './components/LoadingOverlay';
import SystemPermission from './pages/SystemPermission';
import AddSystemPermission from './pages/AddSystemPermission';
import AdminPermissionRequests from './pages/AdminPermissionRequests';

import { ThemeProvider } from './components/ThemeProvider';
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { QueryClient, QueryClientProvider, useQueryClient } from 'react-query';
import { createContext, useContext } from 'react';
import ManagerDashboard from './pages/ManagerDashboard';
import InternetPackages from './pages/InternetPackages';
import Anydesk from './pages/Anydesk';
import Errands from './pages/Errands';
import Purchases from './pages/Purchases';
import SplashScreen from './components/SplashScreen';
export const SocketContext = createContext(null);
export const useSocket = () => useContext(SocketContext);

// Protected Route Component
const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <LoadingOverlay />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// App Routes Component
const AppRoutes = () => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <LoadingOverlay />;
  }

  return (
    <Routes>
      <Route 
        path="/login" 
        element={!isAuthenticated ? <Login /> : <Navigate to="/dashboard" replace />} 
      />
      
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={user?.role === 'manager' ? <ManagerDashboard /> : <Dashboard />} />
        <Route path="tickets" element={<Tickets />} />
        <Route path="tickets/:id" element={<TicketDetail />} />
        <Route path="profile" element={<Profile />} />
        
        {/* Admin only routes */}
        <Route path="users" element={<ProtectedRoute adminOnly><Users /></ProtectedRoute>} />
        <Route path="employees" element={<ProtectedRoute adminOnly><Employees /></ProtectedRoute>} />
        <Route path="custom-data" element={<ProtectedRoute adminOnly><CustomData /></ProtectedRoute>} />
        
        {/* Email route (accessible to all users) */}
        <Route path="email" element={<Email />} />
        
        {/* System Permission route (accessible to all users) */}
        <Route path="system-permission" element={<SystemPermission />} />
        
        {/* Add System Permission route (accessible to all users) */}
        <Route path="add-system-permission" element={<AddSystemPermission />} />
        
        {/* Admin only: System Permission Requests */}
        <Route path="admin-permission-requests" element={<ProtectedRoute adminOnly><AdminPermissionRequests /></ProtectedRoute>} />
        

        
        {/* Internet Packages page (admin only) */}
        <Route path="internet-packages" element={<ProtectedRoute adminOnly><InternetPackages /></ProtectedRoute>} />
        {/* Anydesk page (admin only) */}
        <Route path="anydesk" element={<ProtectedRoute adminOnly><Anydesk /></ProtectedRoute>} />
        {/* Errands page (admin only) */}
        <Route path="errands" element={<ProtectedRoute adminOnly><Errands /></ProtectedRoute>} />
        {/* Purchases page (admin only) */}
        <Route path="purchases" element={<ProtectedRoute adminOnly><Purchases /></ProtectedRoute>} />
      </Route>
      
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

// Main App Component
function App() {
  const [socket, setSocket] = useState(null);
  const queryClient = new QueryClient();
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const s = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000', {
      auth: { token },
      transports: ['websocket'],
      withCredentials: true
    });
    setSocket(s);
    return () => s.disconnect();
  }, []);

  useEffect(() => {
    if (!socket) return;
    // Listen for ticket events and refetch tickets
    socket.on('ticketCreated', () => queryClient.invalidateQueries(['tickets']));
    socket.on('ticketUpdated', () => queryClient.invalidateQueries(['tickets']));
    socket.on('ticketDeleted', () => queryClient.invalidateQueries(['tickets']));
    return () => {
      socket.off('ticketCreated');
      socket.off('ticketUpdated');
      socket.off('ticketDeleted');
    };
  }, [socket]);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  if (showSplash) {
    return <SplashScreen />;
  }

  return (
    <SocketContext.Provider value={socket}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <div className="min-h-screen bg-gray-50">
              <AppRoutes />
            </div>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </SocketContext.Provider>
  );
}

export default App;
