import { Outlet } from "react-router-dom";

// DriverLayout is a thin wrapper — driver pages have their own headers/navigation
export function DriverLayout() {
  return <Outlet />;
}
