import { Navigate, Outlet } from "react-router-dom";
import useAuthStore from "../../store/auth.store";

export default function RequireCustomer() {
  const role = useAuthStore((s) => s.role);

  if (role === "vendor") {
    return <Navigate to="/vendor/dashboard" replace />;
  }

  return <Outlet />;
}
