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
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    async function handleSubmit(e) {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const res = await api.auth.login(email, password);
            login(res.data.accessToken, res.data.user);
            const role = res.data.user.role;
            if (role === "superadmin" || role === "org_admin") {
                navigate("/admin/dashboard", { replace: true });
            }
            else if (role === "driver") {
                navigate("/driver/dashboard", { replace: true });
            }
            else {
                navigate("/queue", { replace: true });
            }
        }
        catch (err) {
            setError(err.message ?? "Login failed");
        }
        finally {
            setLoading(false);
        }
    }
    return (_jsx("div", { className: "flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 to-blue-50", children: _jsxs("div", { className: "w-full max-w-sm", children: [_jsxs("div", { className: "mb-8 text-center", children: [_jsx("div", { className: "mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-600 shadow-lg", children: _jsx("span", { className: "text-2xl font-bold text-white", children: "AS" }) }), _jsx("h1", { className: "text-2xl font-bold text-gray-900", children: "Aunt Sally's Laundry" }), _jsx("p", { className: "mt-1 text-sm text-gray-500", children: "Point of Sale \u2014 Staff Login" })] }), _jsx("div", { className: "rounded-2xl bg-white p-8 shadow-lg ring-1 ring-gray-200", children: _jsxs("form", { onSubmit: handleSubmit, className: "space-y-5", children: [_jsxs("div", { children: [_jsx("label", { className: "mb-1.5 block text-sm font-medium text-gray-700", children: "Email" }), _jsx("input", { type: "email", value: email, onChange: (e) => setEmail(e.target.value), required: true, autoFocus: true, placeholder: "staff@auntsallys.ph", className: "w-full rounded-xl border border-gray-200 px-4 py-3 text-sm transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20" })] }), _jsxs("div", { children: [_jsx("label", { className: "mb-1.5 block text-sm font-medium text-gray-700", children: "Password" }), _jsx("input", { type: "password", value: password, onChange: (e) => setPassword(e.target.value), required: true, placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022", className: "w-full rounded-xl border border-gray-200 px-4 py-3 text-sm transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20" })] }), error && (_jsx("div", { className: "rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200", children: error })), _jsx("button", { type: "submit", disabled: loading, className: "w-full rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-60", children: loading ? "Signing in…" : "Sign In" })] }) }), _jsxs("p", { className: "mt-6 text-center text-xs text-gray-400", children: ["Aunt Sally's Laundry \u00A9 ", new Date().getFullYear()] })] }) }));
}
//# sourceMappingURL=Login.js.map