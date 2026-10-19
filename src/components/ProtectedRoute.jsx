import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function ProtectedRoute({ allowedRoles, children, redirectTo, unauthorizedTo = "/" }) {
  const { user } = useAuth();
  if (!user) return <Navigate to={redirectTo} replace />;
  if (!allowedRoles.includes(user.role)) {
    const fallback = user.role === "seller" ? "/seller" : user.role === "admin" ? "/admin" : unauthorizedTo;
    return <Navigate to={fallback} replace />;
  }
  return children;
}
