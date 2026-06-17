import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import ModeratorRoute from "./components/ModeratorRoute";

import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import Home from "./pages/Home";
import Watch from "./pages/Watch";
import Search from "./pages/Search";
import Upload from "./pages/Upload";
import Studio from "./pages/Studio";
import ModerationQueue from "./pages/ModerationQueue";
import Reports from "./pages/Reports";
import Tiers from "./pages/Tiers";
import Community from "./pages/Community";
import Settings from "./pages/Settings";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/watch/:source/:id" element={<ProtectedRoute><Watch /></ProtectedRoute>} />
          <Route path="/search" element={<ProtectedRoute><Search /></ProtectedRoute>} />
          <Route path="/upload" element={<ProtectedRoute><Upload /></ProtectedRoute>} />
          <Route path="/studio" element={<ProtectedRoute><Studio /></ProtectedRoute>} />
          <Route path="/moderation" element={<ModeratorRoute><ModerationQueue /></ModeratorRoute>} />
          <Route path="/reports" element={<ModeratorRoute><Reports /></ModeratorRoute>} />
          <Route path="/tiers" element={<ProtectedRoute><Tiers /></ProtectedRoute>} />
          <Route path="/community" element={<ProtectedRoute><Community /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
