import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
const NAV_ITEMS = [
    { to: "/admin/dashboard", icon: "📊", label: "Dashboard" },
    { to: "/admin/orders", icon: "📦", label: "Orders" },
    { to: "/admin/customers", icon: "👥", label: "Customers" },
    { to: "/admin/branches", icon: "📍", label: "Branches" },
    { to: "/admin/services", icon: "👕", label: "Services" },
    { to: "/admin/drivers", icon: "🚗", label: "Drivers" },
    { to: "/admin/analytics", icon: "📈", label: "Analytics" },
];
export function AdminLayout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    function handleLogout() {
        logout();
        navigate("/login", { replace: true });
    }
    const initials = user ? `${user.firstName[0]}${user.lastName?.[0] ?? ""}`.toUpperCase() : "?";
    return (_jsxs("div", { className: "flex h-screen bg-gray-50", children: [_jsxs("aside", { className: "flex w-60 flex-col border-r border-gray-200 bg-white", children: [_jsxs("div", { className: "border-b border-gray-100 px-5 py-5", children: [_jsx("div", { className: "font-bold text-lg text-brand-700", children: "Aunt Sally's" }), _jsx("div", { className: "text-xs text-gray-400", children: "Admin Dashboard" })] }), _jsx("nav", { className: "flex-1 space-y-0.5 p-3", children: NAV_ITEMS.map(({ to, icon, label }) => (_jsxs(NavLink, { to: to, className: ({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${isActive
                                ? "bg-brand-50 text-brand-700"
                                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"}`, children: [_jsx("span", { className: "text-base", children: icon }), label] }, to))) }), _jsxs("div", { className: "border-t border-gray-100 p-4", children: [_jsxs("div", { className: "flex items-center gap-3 mb-3", children: [_jsx("div", { className: "flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-sm font-medium text-brand-700", children: initials }), _jsxs("div", { className: "min-w-0", children: [_jsxs("div", { className: "text-sm font-medium text-gray-900 truncate", children: [user?.firstName, " ", user?.lastName] }), _jsx("div", { className: "text-xs text-gray-400", children: user?.role })] })] }), _jsx("button", { onClick: handleLogout, className: "w-full rounded-lg py-1.5 text-xs text-gray-400 hover:bg-gray-50 hover:text-gray-700 transition-colors", children: "Sign out" })] })] }), _jsx("main", { className: "flex-1 overflow-y-auto", children: _jsx(Outlet, {}) })] }));
}
//# sourceMappingURL=AdminLayout.js.map