import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
export function BranchSelectPage() {
    const navigate = useNavigate();
    const { selectBranch } = useAuth();
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        api.branches.list().then((res) => {
            setBranches(res.data);
            setLoading(false);
        });
    }, []);
    function handleSelect(branchId) {
        selectBranch(branchId);
        navigate("/queue", { replace: true });
    }
    return (_jsx("div", { className: "flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 to-blue-50", children: _jsxs("div", { className: "w-full max-w-md", children: [_jsxs("div", { className: "mb-6 text-center", children: [_jsx("h1", { className: "text-2xl font-bold text-gray-900", children: "Select Branch" }), _jsx("p", { className: "text-sm text-gray-500", children: "Choose the branch you're working at" })] }), _jsx("div", { className: "rounded-2xl bg-white p-6 shadow-lg ring-1 ring-gray-200", children: loading ? (_jsx("div", { className: "py-8 text-center text-gray-400", children: "Loading branches\u2026" })) : (_jsx("div", { className: "space-y-2", children: branches.map((b) => (_jsxs("button", { onClick: () => handleSelect(b.id), className: "w-full rounded-xl border border-gray-200 p-4 text-left transition hover:border-brand-400 hover:bg-brand-50", children: [_jsx("div", { className: "font-semibold text-gray-900", children: b.name }), _jsx("div", { className: "text-sm text-gray-500", children: b.address })] }, b.id))) })) })] }) }));
}
//# sourceMappingURL=BranchSelect.js.map