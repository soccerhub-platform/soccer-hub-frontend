import React, { useEffect, useState } from "react";
import { PlusIcon } from "@heroicons/react/24/outline";
import { useAuth } from "../../../shared/AuthContext";
import CreateLeadModal from "./CreateLeadModal";
import { DispatcherLeadsApi } from "./leads.api";
import { DispatcherBranchOption, DispatcherLead } from "./types";
import { buttonStyles } from "../../../shared/ui/buttonStyles";

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const statusLabel = (status: string) => {
  switch (status) {
    case "NEW":
      return "Новый";
    case "CONTACTED":
      return "Связались";
    case "QUALIFIED":
      return "Квалифицирован";
    case "TRIAL_SCHEDULED":
      return "Пробное назначено";
    case "TRIAL_DONE":
      return "Пробное прошло";
    case "WAITING_PAYMENT":
      return "Ожидает оплату";
    case "WON":
      return "Клиент";
    case "LOST":
      return "Отказ";
    default:
      return status;
  }
};

const DispatcherLeadsPage: React.FC = () => {
  const { user } = useAuth();
  const token = user?.accessToken;

  const [branches, setBranches] = useState<DispatcherBranchOption[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [leads, setLeads] = useState<DispatcherLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    if (!token) return;

    let isMounted = true;

    const loadBranches = async () => {
      try {
        const data = await DispatcherLeadsApi.listBranches(token);
        if (!isMounted) return;
        setBranches(data);
        if (!selectedBranchId && data.length > 0) {
          setSelectedBranchId(data[0].id);
        }
      } catch (err) {
        if (!isMounted) return;
        console.error(err);
        setError("Не удалось загрузить филиалы");
      }
    };

    loadBranches();

    return () => {
      isMounted = false;
    };
  }, [token, selectedBranchId]);

  useEffect(() => {
    if (!token || !selectedBranchId) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    const loadLeads = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await DispatcherLeadsApi.list(selectedBranchId, token);
        if (!isMounted) return;
        setLeads(data);
      } catch (err) {
        if (!isMounted) return;
        console.error(err);
        setError("Не удалось загрузить лиды");
        setLeads([]);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadLeads();

    return () => {
      isMounted = false;
    };
  }, [selectedBranchId, token]);

  const refreshLeads = async () => {
    if (!token || !selectedBranchId) return;

    setError(null);
    try {
      const data = await DispatcherLeadsApi.list(selectedBranchId, token);
      setLeads(data);
    } catch (err) {
      console.error(err);
      setError("Не удалось загрузить лиды");
    }
  };

  if (!token) {
    return <div className="text-sm text-red-500">Нет авторизации</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="heading-font text-2xl font-semibold text-dispatcher-700">
            Лиды
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Диспетчер создает и просматривает входящие лиды по филиалу.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="space-y-1 text-sm text-slate-600">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Филиал
            </span>
            <select
              value={selectedBranchId}
              onChange={(event) => setSelectedBranchId(event.target.value)}
              className="min-w-[240px] rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none transition focus:border-cyan-700 focus:ring-4 focus:ring-cyan-100"
            >
              <option value="">Выберите филиал</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            disabled={!selectedBranchId}
            className={buttonStyles("primary")}
          >
            <PlusIcon className="h-4 w-4" />
            Новый лид
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="glass-card rounded-2xl p-4 md:p-5">
        {loading ? (
          <div className="text-sm text-slate-500">Загрузка лидов...</div>
        ) : !selectedBranchId ? (
          <div className="text-sm text-slate-500">Сначала выберите филиал</div>
        ) : leads.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-400">
            Нет лидов
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    Родитель
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    Телефон
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    Дети
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    Статус
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    Создан
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-dispatcher-50/70">
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">
                      {lead.parentName}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{lead.phone}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {lead.children.length}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="rounded-full bg-dispatcher-100 px-2.5 py-1 text-xs font-semibold text-dispatcher-700">
                        {statusLabel(lead.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {formatDate(lead.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreateModal ? (
        <CreateLeadModal
          token={token}
          branches={branches}
          initialBranchId={selectedBranchId}
          onClose={() => setShowCreateModal(false)}
          onSuccess={refreshLeads}
        />
      ) : null}
    </div>
  );
};

export default DispatcherLeadsPage;
