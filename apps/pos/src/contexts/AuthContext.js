import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useState, useEffect } from "react";
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
    const [state, setState] = useState({
        user: null,
        token: null,
        selectedBranchId: null,
        isLoading: true,
    });
    useEffect(() => {
        const token = localStorage.getItem("pos_token");
        const userStr = localStorage.getItem("pos_user");
        const branchId = localStorage.getItem("pos_branch_id");
        if (token && userStr) {
            try {
                const user = JSON.parse(userStr);
                setState({ user, token, selectedBranchId: branchId, isLoading: false });
            }
            catch {
                setState((s) => ({ ...s, isLoading: false }));
            }
        }
        else {
            setState((s) => ({ ...s, isLoading: false }));
        }
    }, []);
    function login(token, user) {
        localStorage.setItem("pos_token", token);
        localStorage.setItem("pos_user", JSON.stringify(user));
        // Default to user's branch if they have one
        if (user.branchId) {
            localStorage.setItem("pos_branch_id", user.branchId);
            setState({ user, token, selectedBranchId: user.branchId, isLoading: false });
        }
        else {
            setState({ user, token, selectedBranchId: null, isLoading: false });
        }
    }
    function logout() {
        localStorage.removeItem("pos_token");
        localStorage.removeItem("pos_user");
        localStorage.removeItem("pos_branch_id");
        setState({ user: null, token: null, selectedBranchId: null, isLoading: false });
    }
    function selectBranch(branchId) {
        localStorage.setItem("pos_branch_id", branchId);
        setState((s) => ({ ...s, selectedBranchId: branchId }));
    }
    return (_jsx(AuthContext.Provider, { value: { ...state, login, logout, selectBranch }, children: children }));
}
export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx)
        throw new Error("useAuth must be used within AuthProvider");
    return ctx;
}
//# sourceMappingURL=AuthContext.js.map