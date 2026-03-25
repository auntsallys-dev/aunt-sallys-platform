import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { POSLayout } from "./components/POSLayout";
import { LoginPage } from "./pages/Login";
import { BranchSelectPage } from "./pages/BranchSelect";
import { QueuePage } from "./pages/Queue";
import { NewOrderPage } from "./pages/NewOrder";
import { OrderDetailPage } from "./pages/OrderDetail";
import { OrderHistoryPage } from "./pages/OrderHistory";
function RequireAuth({ children }) {
    const { user, selectedBranchId, isLoading } = useAuth();
    if (isLoading)
        return _jsx("div", { className: "flex h-screen items-center justify-center text-gray-400", children: "Loading\u2026" });
    if (!user)
        return _jsx(Navigate, { to: "/login", replace: true });
    if (!selectedBranchId)
        return _jsx(Navigate, { to: "/branch-select", replace: true });
    return _jsx(_Fragment, { children: children });
}
function AppRoutes() {
    return (_jsxs(Routes, { children: [_jsx(Route, { path: "/login", element: _jsx(LoginPage, {}) }), _jsx(Route, { path: "/branch-select", element: _jsx(BranchSelectPage, {}) }), _jsxs(Route, { path: "/", element: _jsx(RequireAuth, { children: _jsx(POSLayout, {}) }), children: [_jsx(Route, { index: true, element: _jsx(Navigate, { to: "/queue", replace: true }) }), _jsx(Route, { path: "queue", element: _jsx(QueuePage, {}) }), _jsx(Route, { path: "orders/new", element: _jsx(NewOrderPage, {}) }), _jsx(Route, { path: "orders/history", element: _jsx(OrderHistoryPage, {}) }), _jsx(Route, { path: "orders/:id", element: _jsx(OrderDetailPage, {}) })] })] }));
}
export default function App() {
    return (_jsx(AuthProvider, { children: _jsx(BrowserRouter, { children: _jsx(AppRoutes, {}) }) }));
}
//# sourceMappingURL=App.js.map