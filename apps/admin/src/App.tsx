import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AdminLayout } from "./components/AdminLayout.tsx";
import { DashboardPage } from "./pages/Dashboard.tsx";
import { OrdersPage } from "./pages/Orders.tsx";
import { BranchesPage } from "./pages/Branches.tsx";
import { ServicesPage } from "./pages/Services.tsx";
import { StaffPage } from "./pages/Staff.tsx";
import { SettingsPage } from "./pages/Settings.tsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AdminLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="branches" element={<BranchesPage />} />
          <Route path="services" element={<ServicesPage />} />
          <Route path="staff" element={<StaffPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
