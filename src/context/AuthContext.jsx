import { createContext, useContext, useEffect, useState } from "react";
import { subscribeToAuthChanges, getUserProfile } from "../utils/firebase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeToAuthChanges(async (firebaseUser) => {
      setUser(firebaseUser);
      setProfile(firebaseUser ? await getUserProfile(firebaseUser.uid) : null);
      setLoading(false);
    });
    return unsub;
  }, []);

  const refreshProfile = async () => {
    if (user) setProfile(await getUserProfile(user.uid));
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
