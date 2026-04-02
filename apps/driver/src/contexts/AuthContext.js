import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useState, useEffect } from "react";
const AuthContext = createContext({
    user: null, token: null, isLoading: true,
    login: () => { }, logout: () => { },
});
export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    useEffect(() => {
        const t = localStorage.getItem("driver_token");
        const u = localStorage.getItem("driver_user");
        if (t && u) {
            try {
                setToken(t);
                setUser(JSON.parse(u));
            }
            catch { }
        }
        setIsLoading(false);
    }, []);
    function login(token, user) {
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
    return (_jsx(AuthContext.Provider, { value: { user, token, isLoading, login, logout }, children: children }));
}
export function useAuth() {
    return useContext(AuthContext);
}
//# sourceMappingURL=AuthContext.js.map