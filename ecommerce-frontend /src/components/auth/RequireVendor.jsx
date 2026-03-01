import { Navigate, Outlet, useLocation } from "react-router-dom";
import useAuthStore from "../../store/auth.store";

export default function RequireVendor() {
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const role = useAuthStore((s) => s.role);

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (role !== "vendor") {
    return <Navigate to="/products" replace />;
  }

  return <Outlet />;
}
