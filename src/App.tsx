/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ReactNode, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { LanguageProvider } from './contexts/LanguageContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import OfflineBanner from './components/OfflineBanner';

const LandingPage = lazy(() => import('./pages/LandingPage'));
const ChatPage = lazy(() => import('./pages/ChatPage'));
const WardrobePage = lazy(() => import('./pages/WardrobePage'));
const AnalysisDashboard = lazy(() => import('./pages/AnalysisDashboard'));
const AddClothingPage = lazy(() => import('./pages/AddClothingPage'));
const AuthPage = lazy(() => import('./pages/AuthPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const SubscriptionPage = lazy(() => import('./pages/SubscriptionPage'));

function LoadingScreen() {
  return (
    <div className="flex h-[100vh] w-[100vw] items-center justify-center bg-[#151515]">
      <div className="w-10 h-10 border-4 border-white/10 border-t-accent-fuchsia rounded-full animate-spin" />
    </div>
  );
}

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
          <Suspense fallback={<LoadingScreen />}>
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
          </Suspense>
        </Router>
      </AuthProvider>
    </LanguageProvider>
  );
}
