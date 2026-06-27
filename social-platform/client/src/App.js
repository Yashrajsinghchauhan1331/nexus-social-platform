import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import FeedPage from './pages/FeedPage';
import ProfilePage from './pages/ProfilePage';
import FriendsPage from './pages/FriendsPage';
import MessagesPage from './pages/MessagesPage';
import SearchPage from './pages/SearchPage';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0f1117' }}>
      <div className="spinner" />
    </div>
  );
  return user ? children : <Navigate to="/login" />;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/feed" /> : children;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/" element={<Navigate to={user ? "/feed" : "/login"} />} />
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
      <Route path="/" element={<PrivateRoute><SocketProvider><Layout /></SocketProvider></PrivateRoute>}>
        <Route path="feed" element={<FeedPage />} />
        <Route path="profile/:userId" element={<ProfilePage />} />
        <Route path="friends" element={<FriendsPage />} />
        <Route path="messages" element={<MessagesPage />} />
        <Route path="messages/:userId" element={<MessagesPage />} />
        <Route path="search" element={<SearchPage />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            style: { background: '#1e2130', color: '#e2e8f0', border: '1px solid #2d3748' }
          }}
        />
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
