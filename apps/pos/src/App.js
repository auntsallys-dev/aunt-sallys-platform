import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
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
function RequireAuth({ children }) {
    const { user, selectedBranchId, isLoading } = useAuth();
    if (isLoading)
        return _jsx("div", { className: "flex h-screen items-center justify-center text-gray-400", children: "Loading\u2026" });
    if (!user)
        return _jsx(Navigate, { to: "/login", replace: true });
    // Admins should be in /admin/*
    if (user.role === "superadmin" || user.role === "org_admin")
        return _jsx(Navigate, { to: "/admin/dashboard", replace: true });
    // Drivers should be in /driver/*
    if (user.role === "driver")
        return _jsx(Navigate, { to: "/driver/dashboard", replace: true });
    // Staff need branch selection
    if (!selectedBranchId)
        return _jsx(Navigate, { to: "/branch-select", replace: true });
    return _jsx(_Fragment, { children: children });
}
// Admin guard
function RequireAdmin({ children }) {
    const { user, isLoading } = useAuth();
    if (isLoading)
        return _jsx("div", { className: "flex h-screen items-center justify-center text-gray-400", children: "Loading\u2026" });
    if (!user)
        return _jsx(Navigate, { to: "/login", replace: true });
    if (user.role !== "superadmin" && user.role !== "org_admin")
        return _jsx(Navigate, { to: "/login", replace: true });
    return _jsx(_Fragment, { children: children });
}
// Driver guard
function RequireDriver({ children }) {
    const { user, isLoading } = useAuth();
    if (isLoading)
        return _jsx("div", { className: "flex h-screen items-center justify-center text-gray-400", children: "Loading\u2026" });
    if (!user)
        return _jsx(Navigate, { to: "/login", replace: true });
    if (user.role !== "driver")
        return _jsx(Navigate, { to: "/login", replace: true });
    return _jsx(_Fragment, { children: children });
}
function AppRoutes() {
    return (_jsxs(Routes, { children: [_jsx(Route, { path: "/login", element: _jsx(LoginPage, {}) }), _jsx(Route, { path: "/branch-select", element: _jsx(BranchSelectPage, {}) }), _jsxs(Route, { path: "/", element: _jsx(RequireAuth, { children: _jsx(POSLayout, {}) }), children: [_jsx(Route, { index: true, element: _jsx(Navigate, { to: "/queue", replace: true }) }), _jsx(Route, { path: "queue", element: _jsx(QueuePage, {}) }), _jsx(Route, { path: "orders/new", element: _jsx(NewOrderPage, {}) }), _jsx(Route, { path: "orders/history", element: _jsx(OrderHistoryPage, {}) }), _jsx(Route, { path: "orders/:id", element: _jsx(OrderDetailPage, {}) }), _jsx(Route, { path: "analytics", element: _jsx(AnalyticsPage, {}) }), _jsx(Route, { path: "drivers", element: _jsx(StaffDriversPage, {}) })] }), _jsxs(Route, { path: "/admin", element: _jsx(RequireAdmin, { children: _jsx(AdminLayout, {}) }), children: [_jsx(Route, { index: true, element: _jsx(Navigate, { to: "/admin/dashboard", replace: true }) }), _jsx(Route, { path: "dashboard", element: _jsx(AdminDashboardPage, {}) }), _jsx(Route, { path: "orders", element: _jsx(AdminOrdersPage, {}) }), _jsx(Route, { path: "orders/:id", element: _jsx(OrderDetailPage, {}) }), _jsx(Route, { path: "customers", element: _jsx(AdminCustomersPage, {}) }), _jsx(Route, { path: "drivers", element: _jsx(AdminDriversPage, {}) }), _jsx(Route, { path: "branches", element: _jsx(AdminBranchesPage, {}) }), _jsx(Route, { path: "services", element: _jsx(AdminServicesPage, {}) }), _jsx(Route, { path: "analytics", element: _jsx(AdminAnalyticsPage, {}) })] }), _jsxs(Route, { path: "/driver", element: _jsx(RequireDriver, { children: _jsx(DriverLayout, {}) }), children: [_jsx(Route, { index: true, element: _jsx(Navigate, { to: "/driver/dashboard", replace: true }) }), _jsx(Route, { path: "dashboard", element: _jsx(DriverDashboardPage, {}) }), _jsx(Route, { path: "orders/:id", element: _jsx(DriverOrderDeliveryPage, {}) })] })] }));
}
export default function App() {
    return (_jsx(AuthProvider, { children: _jsx(BrowserRouter, { basename: import.meta.env.BASE_URL, children: _jsx(AppRoutes, {}) }) }));
}
//# sourceMappingURL=App.js.map