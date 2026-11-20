import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './lib/auth';
import { Header } from './components/Header';
import { CommandPalette } from './components/CommandPalette';
import { LandingPage } from './features/landing/LandingPage';
import { StartPanel } from './features/auth/StartPanel';
import { PlantFloorPage } from './features/floor/PlantFloorPage';
import { MachinePassportPage } from './features/machine/MachinePassportPage';
import { ReceivingPage } from './features/receiving/ReceivingPage';
import { ControlRoomPage } from './features/control/ControlRoomPage';
import { WorkshopPage } from './features/workshop/WorkshopPage';
import { LabPage } from './features/lab/LabPage';
import { BenchPage } from './features/bench/BenchPage';
import { DispatchPage } from './features/dispatch/DispatchPage';
import { OfficePage } from './features/office/OfficePage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 30000,
    },
  },
});

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-plate flex items-center justify-center font-mono text-xs text-graphite-3 gap-2">
        <span className="w-4 h-4 border-2 border-hivis border-t-transparent rounded-full animate-spin" />
        AUTHENTICATING CONTROL SESSION...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const AppLayout: React.FC = () => {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/';

  return (
    <div className="min-h-screen bg-plate text-graphite font-sans flex flex-col">
      {/* Header mounted across all views */}
      <Header onOpenCommandPalette={() => setCommandPaletteOpen(true)} />

      {/* Main View Area */}
      <main className="flex-1 pb-12">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<StartPanel />} />

          {/* Protected Control Room Suite (Rooms 1-7 + Floor + Passport) */}
          <Route
            path="/floor"
            element={
              <ProtectedRoute>
                <PlantFloorPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/machines/:id"
            element={
              <ProtectedRoute>
                <MachinePassportPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/receiving"
            element={
              <ProtectedRoute>
                <ReceivingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/control"
            element={
              <ProtectedRoute>
                <ControlRoomPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/workshop"
            element={
              <ProtectedRoute>
                <WorkshopPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/lab"
            element={
              <ProtectedRoute>
                <LabPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/bench"
            element={
              <ProtectedRoute>
                <BenchPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dispatch"
            element={
              <ProtectedRoute>
                <DispatchPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/office"
            element={
              <ProtectedRoute>
                <OfficePage />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Global Command Palette */}
      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <AppLayout />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
