import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Onboarding } from './pages/Onboarding';
import { Analysis } from './pages/Analysis';
import { Results } from './pages/Results';
import { Paywall } from './pages/Paywall';
import { Closet } from './pages/Closet';
import { Outfits } from './pages/Outfits';
import { Chatbot } from './pages/Chatbot';
import { TabBar } from './components/layout/TabBar';
import { Header } from './components/layout/Header';
import { useAuth } from './contexts/AuthContext';

const PageWrapper = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const { user } = useAuth();
  const hideNavigation = ['/login', '/onboarding', '/analysis', '/results', '/paywall'].includes(location.pathname) || (!user && location.pathname === '/');

  return (
    <>
      {!hideNavigation && <Header />}
      <main className={`flex-1 overflow-y-auto no-scrollbar ${!hideNavigation ? 'pt-16 pb-20' : ''}`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="min-h-full"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
      {!hideNavigation && <TabBar />}
    </>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="h-dvh flex flex-col max-w-lg mx-auto bg-white shadow-2xl overflow-x-hidden">
          <PageWrapper>
            <Routes>
                {/* Public routes */}
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                
                {/* Protected routes */}
                <Route path="/onboarding" element={
                  <ProtectedRoute><Onboarding /></ProtectedRoute>
                } />
                <Route path="/analysis" element={
                  <ProtectedRoute><Analysis /></ProtectedRoute>
                } />
                <Route path="/results" element={
                  <ProtectedRoute><Results /></ProtectedRoute>
                } />
                <Route path="/diagnosis" element={
                  <ProtectedRoute><Results /></ProtectedRoute>
                } />
                <Route path="/paywall" element={
                  <ProtectedRoute><Paywall /></ProtectedRoute>
                } />
                <Route path="/closet" element={
                  <ProtectedRoute><Closet /></ProtectedRoute>
                } />
                <Route path="/outfits" element={
                  <ProtectedRoute><Outfits /></ProtectedRoute>
                } />
                <Route path="/chat" element={
                  <ProtectedRoute><Chatbot /></ProtectedRoute>
                } />
              </Routes>
          </PageWrapper>
        </div>
      </Router>
    </AuthProvider>
  );
}
