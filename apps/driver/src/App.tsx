import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { LoginPage } from "./pages/Login";
import { DashboardPage } from "./pages/Dashboard";
import { OrderDeliveryPage } from "./pages/OrderDelivery";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="flex h-screen items-center justify-center text-gray-400">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/dashboard"
        element={<RequireAuth><DashboardPage /></RequireAuth>}
      />
      <Route
        path="/orders/:id"
        element={<RequireAuth><OrderDeliveryPage /></RequireAuth>}
      />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
