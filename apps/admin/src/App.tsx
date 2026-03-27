import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AdminLayout } from "./components/AdminLayout";
import { DashboardPage } from "./pages/Dashboard";
import { OrdersPage } from "./pages/Orders";
import { BranchesPage } from "./pages/Branches";
import { ServicesPage } from "./pages/Services";
import { StaffPage } from "./pages/Staff";
import { SettingsPage } from "./pages/Settings";
import { CustomersPage } from "./pages/Customers";
import { DriversPage } from "./pages/Drivers";

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
          <Route path="customers" element={<CustomersPage />} />
          <Route path="drivers" element={<DriversPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
