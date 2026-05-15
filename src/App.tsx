/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { LanguageProvider } from './contexts/LanguageContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import LandingPage from './pages/LandingPage';
import ChatPage from './pages/ChatPage';
import WardrobePage from './pages/WardrobePage';
import AnalysisDashboard from './pages/AnalysisDashboard';
import AddClothingPage from './pages/AddClothingPage';
import AuthPage from './pages/AuthPage';
import ProfilePage from './pages/ProfilePage';
import SubscriptionPage from './pages/SubscriptionPage';
import OfflineBanner from './components/OfflineBanner';

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) return null; // Or a loading spinner
  if (!user) return <Navigate to="/" replace />;
  
  return <>{children}</>;
}

function PublicRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) return null;
  if (user) return <Navigate to="/chat" replace />;
  
  return <>{children}</>;
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <OfflineBanner />
        <Router>
          <Routes>
            <Route path="/" element={<PublicRoute><Layout><LandingPage /></Layout></PublicRoute>} />
            <Route path="/login" element={<PublicRoute><Layout><AuthPage /></Layout></PublicRoute>} />
            <Route path="/chat" element={<ProtectedRoute><Layout><ChatPage /></Layout></ProtectedRoute>} />
            <Route path="/wardrobe" element={<ProtectedRoute><Layout><WardrobePage /></Layout></ProtectedRoute>} />
            <Route path="/analysis" element={<ProtectedRoute><Layout><AnalysisDashboard /></Layout></ProtectedRoute>} />
            <Route path="/add" element={<ProtectedRoute><Layout><AddClothingPage /></Layout></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Layout><ProfilePage /></Layout></ProtectedRoute>} />
            <Route path="/subscription" element={<ProtectedRoute><Layout><SubscriptionPage /></Layout></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </LanguageProvider>
  );
}
