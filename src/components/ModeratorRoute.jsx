import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Same pattern as ProtectedRoute, but additionally requires the signed-in
// user's Firestore profile to have role "moderator" or "admin". This is a
// UI-convenience gate only - the real enforcement is in firestore.rules,
// since a determined user could otherwise just navigate to /moderation
// directly and see a flash of content before a client-side check redirects
// them. The rules ensure that even if someone bypasses this component
// entirely, Firestore itself refuses to serve them pending/rejected uploads
// or let them write a review decision.
export default function ModeratorRoute({ children }) {
  const { user, profile, loading } = useAuth();
  if (loading) return <div style={{ background: "var(--void)", height: "100vh" }} />;
  if (!user) return <Navigate to="/login" replace />;
  const isModerator = profile?.role === "moderator" || profile?.role === "admin";
  if (!isModerator) return <Navigate to="/" replace />;
  return children;
}
