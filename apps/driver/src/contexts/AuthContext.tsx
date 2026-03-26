import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  branchId?: string;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthState>({
  user: null, token: null, isLoading: true,
  login: () => {}, logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const t = localStorage.getItem("driver_token");
    const u = localStorage.getItem("driver_user");
    if (t && u) {
      try {
        setToken(t);
        setUser(JSON.parse(u));
      } catch {}
    }
    setIsLoading(false);
  }, []);

  function login(token: string, user: AuthUser) {
    localStorage.setItem("driver_token", token);
    localStorage.setItem("driver_user", JSON.stringify(user));
    setToken(token);
    setUser(user);
  }

  function logout() {
    localStorage.removeItem("driver_token");
    localStorage.removeItem("driver_user");
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
