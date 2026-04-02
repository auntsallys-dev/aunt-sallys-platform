import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { LoginPage } from "./pages/Login";
import { DashboardPage } from "./pages/Dashboard";
import { OrderDeliveryPage } from "./pages/OrderDelivery";
function RequireAuth({ children }) {
    const { user, isLoading } = useAuth();
    if (isLoading)
        return _jsx("div", { className: "flex h-screen items-center justify-center text-gray-400", children: "Loading\u2026" });
    if (!user)
        return _jsx(Navigate, { to: "/login", replace: true });
    return _jsx(_Fragment, { children: children });
}
function AppRoutes() {
    return (_jsxs(Routes, { children: [_jsx(Route, { path: "/login", element: _jsx(LoginPage, {}) }), _jsx(Route, { path: "/dashboard", element: _jsx(RequireAuth, { children: _jsx(DashboardPage, {}) }) }), _jsx(Route, { path: "/orders/:id", element: _jsx(RequireAuth, { children: _jsx(OrderDeliveryPage, {}) }) }), _jsx(Route, { path: "/", element: _jsx(Navigate, { to: "/dashboard", replace: true }) })] }));
}
export default function App() {
    return (_jsx(AuthProvider, { children: _jsx(BrowserRouter, { basename: import.meta.env.BASE_URL, children: _jsx(AppRoutes, {}) }) }));
}
//# sourceMappingURL=App.js.map