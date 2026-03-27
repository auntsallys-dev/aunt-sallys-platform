import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { POSLayout } from "./components/POSLayout";
import { AdminLayout } from "./components/AdminLayout";
import { DriverLayout } from "./components/DriverLayout";
import { LoginPage } from "./pages/Login";
import { BranchSelectPage } from "./pages/BranchSelect";
import { QueuePage } from "./pages/Queue";
import { NewOrderPage } from "./pages/NewOrder";
import { OrderDetailPage } from "./pages/OrderDetail";
import { OrderHistoryPage } from "./pages/OrderHistory";
import { AnalyticsPage } from "./pages/Analytics";
import { StaffDriversPage } from "./pages/StaffDrivers";
// Admin pages
import { AdminDashboardPage } from "./pages/admin/Dashboard";
import { AdminOrdersPage } from "./pages/admin/Orders";
import { AdminCustomersPage } from "./pages/admin/Customers";
import { AdminDriversPage } from "./pages/admin/Drivers";
import { AdminBranchesPage } from "./pages/admin/Branches";
import { AdminServicesPage } from "./pages/admin/Services";
import { AdminAnalyticsPage } from "./pages/admin/Analytics";
// Driver pages
import { DriverDashboardPage } from "./pages/driver/Dashboard";
import { DriverOrderDeliveryPage } from "./pages/driver/OrderDelivery";

// Staff/branch_admin guard — also redirects admins and drivers to their UIs
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, selectedBranchId, isLoading } = useAuth();
  if (isLoading) return <div className="flex h-screen items-center justify-center text-gray-400">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  // Admins should be in /admin/*
  if (user.role === "superadmin" || user.role === "org_admin") return <Navigate to="/admin/dashboard" replace />;
  // Drivers should be in /driver/*
  if (user.role === "driver") return <Navigate to="/driver/dashboard" replace />;
  // Staff need branch selection
  if (!selectedBranchId) return <Navigate to="/branch-select" replace />;
  return <>{children}</>;
}

// Admin guard
function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="flex h-screen items-center justify-center text-gray-400">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "superadmin" && user.role !== "org_admin") return <Navigate to="/login" replace />;
  return <>{children}</>;
}

// Driver guard
function RequireDriver({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="flex h-screen items-center justify-center text-gray-400">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "driver") return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/branch-select" element={<BranchSelectPage />} />

      {/* Staff POS routes */}
      <Route
        path="/"
        element={
          <RequireAuth>
            <POSLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/queue" replace />} />
        <Route path="queue" element={<QueuePage />} />
        <Route path="orders/new" element={<NewOrderPage />} />
        <Route path="orders/history" element={<OrderHistoryPage />} />
        <Route path="orders/:id" element={<OrderDetailPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="drivers" element={<StaffDriversPage />} />
      </Route>

      {/* Admin routes */}
      <Route
        path="/admin"
        element={
          <RequireAdmin>
            <AdminLayout />
          </RequireAdmin>
        }
      >
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboardPage />} />
        <Route path="orders" element={<AdminOrdersPage />} />
        <Route path="customers" element={<AdminCustomersPage />} />
        <Route path="drivers" element={<AdminDriversPage />} />
        <Route path="branches" element={<AdminBranchesPage />} />
        <Route path="services" element={<AdminServicesPage />} />
        <Route path="analytics" element={<AdminAnalyticsPage />} />
      </Route>

      {/* Driver routes */}
      <Route
        path="/driver"
        element={
          <RequireDriver>
            <DriverLayout />
          </RequireDriver>
        }
      >
        <Route index element={<Navigate to="/driver/dashboard" replace />} />
        <Route path="dashboard" element={<DriverDashboardPage />} />
        <Route path="orders/:id" element={<DriverOrderDeliveryPage />} />
      </Route>
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
