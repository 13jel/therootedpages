import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function PrivateRoute({ children }) {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) return <p>Laddar...</p>;
  if (!session)
    return <Navigate to="/login" state={{ from: location }} replace />;

  return children;
}
