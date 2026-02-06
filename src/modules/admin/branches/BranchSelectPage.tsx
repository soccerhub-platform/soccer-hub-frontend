// src/admin/BranchSelectPage.tsx

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BuildingOfficeIcon } from "@heroicons/react/24/outline";

import { useAuth } from "../../../shared/AuthContext";
import { useAdminBranch } from "../BranchContext";
import { BranchApi } from "./branch.api";
import toast from "react-hot-toast";

/* ================= UI MODEL ================= */

interface BranchView {
  id: string;
  name: string;
  city?: string;
}

/* ================= COMPONENT ================= */

export default function BranchSelectPage() {
  const [branches, setBranches] = useState<BranchView[]>([]);
  const [loading, setLoading] = useState(true);

  const { user } = useAuth();
  const token = user?.accessToken;

  const { setBranch, setBranchesCount } = useAdminBranch();
  const navigate = useNavigate();

  useEffect(() => {
    const loadBranches = async () => {
      setLoading(true);
      try {
        const apiBranches = await BranchApi.list(token);

        const mapped = apiBranches.map((b) => ({
          id: b.branchId,
          name: b.name,
          city: b.address,
        }));

        setBranches(mapped);
        setBranchesCount(mapped.length);

        if (mapped.length === 1) {
          setBranch(mapped[0].id, mapped[0].name);
          navigate("/admin/dashboard", { replace: true });
        }
      } catch (e) {
        console.error("Failed to load branches", e);
      } finally {
        setLoading(false);
      }
    };

    if (!token) {
      toast.error("Нет авторизации");
      return;
    }
    loadBranches();
  }, [token, navigate, setBranch, setBranchesCount]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center app-bg-admin">
        <div className="glass-card rounded-2xl px-6 py-4 text-sm text-gray-500">
          Загрузка филиалов…
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center app-bg-admin px-4">
      <div className="glass-card rounded-3xl p-8 w-full max-w-md">
        <h1 className="heading-font text-2xl font-semibold text-gray-800 mb-2">
          Выберите филиал
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          Для продолжения работы выберите филиал
        </p>

        <div className="space-y-3">
          {branches.map((b) => (
            <button
              key={b.id}
              onClick={() => {
                setBranch(b.id, b.name);
                navigate("/admin/dashboard");
              }}
              className="w-full flex items-center gap-4 p-4 border rounded-xl hover:bg-admin-50 transition"
            >
              <div className="h-10 w-10 rounded-full bg-admin-100 flex items-center justify-center">
                <BuildingOfficeIcon className="h-5 w-5 text-admin-700" />
              </div>

              <div className="text-left">
                <div className="font-medium text-gray-800">{b.name}</div>
                {b.city && (
                  <div className="text-xs text-gray-500">{b.city}</div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
