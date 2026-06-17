import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ModeratorRoute({ children }) {
  const { user, profile, loading } = useAuth();
  if (loading) return <div style={{ background: "var(--void)", height: "100vh" }} />;
  if (!user) return <Navigate to="/login" replace />;
  if (profile?.role !== "moderator" && profile?.role !== "admin") return <Navigate to="/" replace />;
  return children;
}
