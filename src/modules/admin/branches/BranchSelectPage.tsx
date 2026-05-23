// src/admin/BranchSelectPage.tsx

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowPathIcon,
  BuildingOfficeIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

import { useAuth } from "../../../shared/AuthContext";
import { useAdminBranch } from "../BranchContext";
import { BranchApi } from "./branch.api";
import toast from "react-hot-toast";
import { Button, EmptyState } from "../../../shared/ui";

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
  const [error, setError] = useState<string | null>(null);

  const { user } = useAuth();
  const token = user?.accessToken;

  const { setBranch, setBranchesCount } = useAdminBranch();
  const navigate = useNavigate();

  const loadBranches = async () => {
    setLoading(true);
    setError(null);
    try {
      const apiBranches = await BranchApi.list();

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
      setError("Не удалось загрузить филиалы");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      toast.error("Нет авторизации");
      return;
    }
    void loadBranches();
  }, [token, navigate, setBranch, setBranchesCount]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <ArrowPathIcon className="h-5 w-5 animate-spin text-cyan-800" />
            Загрузка филиалов...
          </div>
          <div className="mt-4 space-y-3">
            <div className="h-14 animate-pulse rounded-xl bg-slate-100" />
            <div className="h-14 animate-pulse rounded-xl bg-slate-100" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan-50">
            <BuildingOfficeIcon className="h-6 w-6 text-cyan-800" />
          </div>
          <div>
            <h1 className="heading-font text-2xl font-semibold text-slate-900">
              Выберите филиал
            </h1>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              После выбора система откроет рабочий кабинет администратора для этого филиала.
            </p>
          </div>
        </div>

        {error ? (
          <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4">
            <div className="flex items-start gap-3">
              <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
              <div className="min-w-0">
                <div className="text-sm font-semibold text-rose-800">Ошибка загрузки</div>
                <div className="mt-1 text-sm text-rose-700">{error}</div>
                <Button type="button" variant="softDanger" size="sm" className="mt-3" onClick={loadBranches}>
                  Повторить
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {!error && branches.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              title="Филиалы не найдены"
              description="У вашей учетной записи пока нет доступных филиалов."
            />
          </div>
        ) : null}

        {!error && branches.length > 0 ? (
          <div className="mt-6 space-y-3">
            {branches.map((branch) => (
              <button
                key={branch.id}
                type="button"
                onClick={() => {
                  setBranch(branch.id, branch.name);
                  navigate("/admin/dashboard");
                }}
                className="group flex w-full items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-cyan-200 hover:bg-cyan-50/40"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 transition group-hover:bg-white">
                  <BuildingOfficeIcon className="h-5 w-5 text-slate-500 group-hover:text-cyan-800" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="font-medium text-slate-900">{branch.name}</div>
                  {branch.city ? (
                    <div className="mt-0.5 truncate text-xs text-slate-500">{branch.city}</div>
                  ) : (
                    <div className="mt-0.5 text-xs text-slate-400">Адрес не указан</div>
                  )}
                </div>

                <ChevronRightIcon className="h-5 w-5 text-slate-300 transition group-hover:text-cyan-800" />
              </button>
            ))}
          </div>
        ) : null}

        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-500">
          Филиал можно будет сменить позже в верхней панели администратора.
        </div>
      </div>
    </div>
  );
}
