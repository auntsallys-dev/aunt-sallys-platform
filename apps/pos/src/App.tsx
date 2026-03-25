import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { POSLayout } from "./components/POSLayout";
import { LoginPage } from "./pages/Login";
import { BranchSelectPage } from "./pages/BranchSelect";
import { QueuePage } from "./pages/Queue";
import { NewOrderPage } from "./pages/NewOrder";
import { OrderDetailPage } from "./pages/OrderDetail";
import { OrderHistoryPage } from "./pages/OrderHistory";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, selectedBranchId, isLoading } = useAuth();
  if (isLoading) return <div className="flex h-screen items-center justify-center text-gray-400">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!selectedBranchId) return <Navigate to="/branch-select" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/branch-select" element={<BranchSelectPage />} />
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
