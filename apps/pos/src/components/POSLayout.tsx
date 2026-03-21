import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useState, useEffect } from "react";
import { api } from "../lib/api";

export function POSLayout() {
  const navigate = useNavigate();
  const { user, selectedBranchId, logout } = useAuth();
  const [branch, setBranch] = useState<any>(null);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    if (selectedBranchId) {
      api.branches.list().then((res) => {
        const found = res.data.find((b: any) => b.id === selectedBranchId);
        if (found) setBranch(found);
      }).catch(() => {});
    }
  }, [selectedBranchId]);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  const timeStr = time.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" });
  const dateStr = time.toLocaleDateString("en-PH", { weekday: "short", month: "short", day: "numeric" });

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="flex w-56 flex-col bg-brand-900 text-white">
        <div className="border-b border-brand-800 px-4 py-5">
          <div className="font-bold text-lg leading-tight">Aunt Sally's</div>
          <div className="text-xs text-brand-300">Point of Sale</div>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          <NavLink
            to="/queue"
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive ? "bg-brand-700 text-white" : "text-brand-200 hover:bg-brand-800 hover:text-white"
              }`
            }
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
            Queue
          </NavLink>
          <NavLink
            to="/orders/new"
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive ? "bg-brand-700 text-white" : "text-brand-200 hover:bg-brand-800 hover:text-white"
              }`
            }
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            New Order
          </NavLink>
          <NavLink
            to="/orders/history"
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive ? "bg-brand-700 text-white" : "text-brand-200 hover:bg-brand-800 hover:text-white"
              }`
            }
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            History
          </NavLink>
        </nav>

        {/* Clock */}
        <div className="border-t border-brand-800 px-4 py-3 text-center">
          <div className="text-lg font-bold text-white tabular-nums">{timeStr}</div>
          <div className="text-xs text-brand-400">{dateStr}</div>
        </div>

        {/* User info + logout */}
        <div className="border-t border-brand-800 p-4">
          <div className="text-xs text-brand-400">{branch?.name ?? "Loading branch…"}</div>
          <div className="text-sm font-medium text-white">{user?.firstName} {user?.lastName}</div>
          <button
            onClick={handleLogout}
            className="mt-2 w-full rounded-lg py-1.5 text-xs text-brand-300 hover:bg-brand-800 hover:text-white transition-colors"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
