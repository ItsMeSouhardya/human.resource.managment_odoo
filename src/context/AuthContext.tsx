import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { SessionUser } from "../shared/types";

type AuthContextValue = {
  currentUser: SessionUser | null;
  setCurrentUser: (user: SessionUser | null) => void;
  logout: () => void;
  isLoading: boolean;
};

export const AuthContext = createContext<AuthContextValue>({
  currentUser: null,
  setCurrentUser: () => undefined,
  logout: () => undefined,
  isLoading: true,
});

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}

export function AuthProvider({ children, onPageChange }: { children: ReactNode; onPageChange: (page: import("../shared/types").AppPage) => void }) {
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/auth/me", { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("Not authenticated");
        return res.json();
      })
      .then((data) => {
        setCurrentUser(data.user ?? null);
      })
      .catch(() => {
        setCurrentUser(null);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  function logout() {
    fetch("/auth/logout", { method: "POST", credentials: "include" }).catch(() => undefined);
    setCurrentUser(null);
    onPageChange("home");
  }

  return (
    <AuthContext.Provider value={{ currentUser, setCurrentUser, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}
