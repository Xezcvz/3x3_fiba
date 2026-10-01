import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ModalProvider } from './context/ModalContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';

// Public Pages
import Home from './pages/Home';
import Schedule from './pages/Schedule';
import Results from './pages/Results';
import Teams from './pages/Teams';
import TeamDetail from './pages/TeamDetail';
import MatchDetail from './pages/MatchDetail';
import News from './pages/News';

// Admin Pages
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import ManageMatches from './pages/admin/ManageMatches';
import ManageTeams from './pages/admin/ManageTeams';
import ManageNews from './pages/admin/ManageNews';
import ManageDraw from './pages/admin/ManageDraw';

export default function App() {
  return (
    <AuthProvider>
      <ModalProvider>
        <BrowserRouter>
          <div className="min-h-screen flex flex-col bg-base-gray50 text-slate-800">
          <Navbar />
          
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Home />} />
              <Route path="/schedule" element={<Schedule />} />
              <Route path="/results" element={<Results />} />
              <Route path="/teams" element={<Teams />} />
              <Route path="/teams/:id" element={<TeamDetail />} />
              <Route path="/matches/:id" element={<MatchDetail />} />
              <Route path="/news" element={<News />} />

              {/* Admin Auth */}
              <Route path="/admin/login" element={<AdminLogin />} />

              {/* Admin Protected Routes */}
              <Route
                path="/admin/dashboard"
                element={
                  <ProtectedRoute>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/matches"
                element={
                  <ProtectedRoute>
                    <ManageMatches />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/teams"
                element={
                  <ProtectedRoute>
                    <ManageTeams />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/news"
                element={
                  <ProtectedRoute>
                    <ManageNews />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/draw"
                element={
                  <ProtectedRoute>
                    <ManageDraw />
                  </ProtectedRoute>
                }
              />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>

          <Footer />
        </div>
      </BrowserRouter>
      </ModalProvider>
    </AuthProvider>
  );
}
