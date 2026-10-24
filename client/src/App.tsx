import React, { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Navbar } from "./components/Navbar";
import { Sidebar } from "./components/Sidebar";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { DashboardPage } from "./pages/DashboardPage";
import { AdminDashboardPage } from "./pages/AdminDashboardPage";
import { UploadModal } from "./components/UploadModal";

const ProtectedLayout: React.FC<{ children: React.ReactNode; requireAdmin?: boolean }> = ({
  children,
  requireAdmin = false,
}) => {
  const { user, loading } = useAuth();
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-vault-950 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-vault-700 border-t-vault-400 rounded-full animate-spin" />
        <span className="text-xs text-slate-500">Loading session…</span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && user.role !== "ADMIN") {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-vault-950 text-slate-100 flex flex-col">
      <Navbar />
      <div className="flex-1 flex">
        <Sidebar onOpenUpload={() => setIsUploadOpen(true)} />
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto max-w-full">
          {children}
        </main>
      </div>

      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={() => window.location.reload()}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedLayout>
                <DashboardPage filterType="all" />
              </ProtectedLayout>
            }
          />

          <Route
            path="/documents/my"
            element={
              <ProtectedLayout>
                <DashboardPage filterType="my" />
              </ProtectedLayout>
            }
          />

          <Route
            path="/documents/shared"
            element={
              <ProtectedLayout>
                <DashboardPage filterType="shared" />
              </ProtectedLayout>
            }
          />

          <Route
            path="/admin"
            element={
              <ProtectedLayout requireAdmin>
                <AdminDashboardPage />
              </ProtectedLayout>
            }
          />

          <Route
            path="/admin/audit"
            element={
              <ProtectedLayout requireAdmin>
                <AdminDashboardPage />
              </ProtectedLayout>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
