import { type ReactNode } from "react";
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
export declare function AuthProvider({ children }: {
    children: ReactNode;
}): import("react/jsx-runtime").JSX.Element;
export declare function useAuth(): AuthState;
export {};
//# sourceMappingURL=AuthContext.d.ts.map