import { Outlet, NavLink } from "react-router-dom";

const NAV_ITEMS = [
  { to: "/dashboard", icon: "📊", label: "Dashboard" },
  { to: "/orders", icon: "📦", label: "Orders" },
  { to: "/customers", icon: "👥", label: "Customers" },
  { to: "/branches", icon: "📍", label: "Branches" },
  { to: "/services", icon: "👕", label: "Services" },
  { to: "/staff", icon: "👤", label: "Staff" },
  { to: "/drivers", icon: "🚗", label: "Drivers" },
  { to: "/settings", icon: "⚙️", label: "Settings" },
];

export function AdminLayout() {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="flex w-60 flex-col border-r border-gray-200 bg-white">
        {/* Logo */}
        <div className="border-b border-gray-100 px-5 py-5">
          <div className="font-bold text-lg text-brand-700">Aunt Sally's</div>
          <div className="text-xs text-gray-400">Admin Dashboard</div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-0.5 p-3">
          {NAV_ITEMS.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-brand-50 text-brand-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`
              }
            >
              <span className="text-base">{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="border-t border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-sm font-medium text-brand-700">
              SA
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900">Sally Reyes</div>
              <div className="text-xs text-gray-400">org_admin</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
