import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
export function LoginPage() {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    async function handleSubmit(e) {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const res = await api.auth.login(email.trim(), password);
            const user = res.data.user;
            // Only allow staff and branch_admin roles
            if (!["staff", "branch_admin", "org_admin", "superadmin"].includes(user.role)) {
                setError("Access denied. Driver accounts must have staff or branch_admin role.");
                return;
            }
            login(res.data.accessToken, {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                branchId: user.branchId,
            });
            navigate("/dashboard", { replace: true });
        }
        catch (err) {
            setError(err.message ?? "Login failed");
        }
        finally {
            setLoading(false);
        }
    }
    return (_jsx("div", { className: "flex min-h-screen items-center justify-center bg-gray-50 px-4", children: _jsxs("div", { className: "w-full max-w-sm", children: [_jsxs("div", { className: "mb-8 text-center", children: [_jsx("div", { className: "mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 shadow-lg", children: _jsx("span", { className: "text-xl font-bold text-white", children: "AS" }) }), _jsx("h1", { className: "text-2xl font-bold text-gray-900", children: "Driver App" }), _jsx("p", { className: "text-sm text-gray-500", children: "Aunt Sally's Laundry" })] }), _jsxs("form", { onSubmit: handleSubmit, className: "rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200", children: [error && (_jsx("div", { className: "mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200", children: error })), _jsxs("div", { className: "mb-4", children: [_jsx("label", { className: "mb-1.5 block text-sm font-medium text-gray-700", children: "Email" }), _jsx("input", { type: "email", value: email, onChange: (e) => setEmail(e.target.value), required: true, autoComplete: "email", className: "w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" })] }), _jsxs("div", { className: "mb-6", children: [_jsx("label", { className: "mb-1.5 block text-sm font-medium text-gray-700", children: "Password" }), _jsx("input", { type: "password", value: password, onChange: (e) => setPassword(e.target.value), required: true, autoComplete: "current-password", className: "w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" })] }), _jsx("button", { type: "submit", disabled: loading || !email.trim() || !password, className: "w-full rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60 transition-colors", children: loading ? "Signing in…" : "Sign In" })] })] }) }));
}
//# sourceMappingURL=Login.js.map