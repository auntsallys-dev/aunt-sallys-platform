import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";

export function BranchSelectPage() {
  const navigate = useNavigate();
  const { selectBranch } = useAuth();
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.branches.list().then((res) => {
      setBranches(res.data);
      setLoading(false);
    });
  }, []);

  function handleSelect(branchId: string) {
    selectBranch(branchId);
    navigate("/queue", { replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 to-blue-50">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Select Branch</h1>
          <p className="text-sm text-gray-500">Choose the branch you're working at</p>
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-lg ring-1 ring-gray-200">
          {loading ? (
            <div className="py-8 text-center text-gray-400">Loading branches…</div>
          ) : (
            <div className="space-y-2">
              {branches.map((b) => (
                <button
                  key={b.id}
                  onClick={() => handleSelect(b.id)}
                  className="w-full rounded-xl border border-gray-200 p-4 text-left transition hover:border-brand-400 hover:bg-brand-50"
                >
                  <div className="font-semibold text-gray-900">{b.name}</div>
                  <div className="text-sm text-gray-500">{b.address}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
