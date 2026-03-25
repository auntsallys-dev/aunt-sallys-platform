import { type ReactNode } from "react";
interface AuthUser {
    id: string;
    email: string | null;
    firstName: string;
    lastName: string;
    role: string;
    orgId: string | null;
    branchId: string | null;
}
interface AuthState {
    user: AuthUser | null;
    token: string | null;
    selectedBranchId: string | null;
    isLoading: boolean;
}
interface AuthContextValue extends AuthState {
    login: (token: string, user: AuthUser) => void;
    logout: () => void;
    selectBranch: (branchId: string) => void;
}
export declare function AuthProvider({ children }: {
    children: ReactNode;
}): import("react/jsx-runtime").JSX.Element;
export declare function useAuth(): AuthContextValue;
export {};
//# sourceMappingURL=AuthContext.d.ts.map