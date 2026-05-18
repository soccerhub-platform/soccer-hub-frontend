import React, { useEffect, useMemo, useState } from "react";
import { UserPlusIcon, UserGroupIcon, ChartBarIcon } from "@heroicons/react/24/outline";
import { DispatcherLeadsApi } from "./leads/leads.api";
import { DispatcherBranchOption } from "./leads/types";
import { apiClient } from "../../shared/api";

interface FunnelAnalyticsOutput {
  totals?: Record<string, number>;
  rates?: {
    new_to_qualified?: number;
    qualified_to_trial_scheduled?: number;
    trial_scheduled_to_won?: number;
    win_rate_on_closed?: number;
  };
  series?: Array<Record<string, number | string>>;
}

const toDateInput = (d: Date) => d.toISOString().slice(0, 10);
const FUNNEL_LABELS: Record<string, string> = {
  NEW: "Новый лид",
  CONTACTED: "Связались",
  QUALIFIED: "Квалифицирован",
  TRIAL_SCHEDULED: "Пробное назначено",
  TRIAL_DONE: "Пробное проведено",
  WAITING_PAYMENT: "Ожидает оплату",
  WON: "Стал клиентом",
  LOST: "Отказался",
};

const DispatcherDashboard: React.FC = () => {
  const [branches, setBranches] = useState<DispatcherBranchOption[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [funnel, setFunnel] = useState<FunnelAnalyticsOutput | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const dateTo = useMemo(() => new Date(), []);
  const dateFrom = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d;
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadBranches = async () => {
      try {
        const data = await DispatcherLeadsApi.listBranches();
        if (!mounted) return;
        setBranches(data);
        if (data.length > 0) {
          setSelectedBranchId((prev) => prev || data[0].id);
        }
      } catch {
        if (!mounted) return;
        setError("Не удалось загрузить филиалы");
      }
    };
    loadBranches();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedBranchId) {
      setLoading(false);
      return;
    }
    let mounted = true;
    const loadAnalytics = async () => {
      setLoading(true);
      setError(null);
      try {
        const qs = new URLSearchParams({
          branchId: selectedBranchId,
          dateFrom: toDateInput(dateFrom),
          dateTo: toDateInput(dateTo),
          groupBy: "WEEK",
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });
        const data = await apiClient.get<FunnelAnalyticsOutput>(`/dispatcher/analytics/funnel?${qs.toString()}`);
        if (!mounted) return;
        setFunnel(data);
      } catch {
        if (!mounted) return;
        setError("Не удалось загрузить аналитику");
        setFunnel(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadAnalytics();
    return () => {
      mounted = false;
    };
  }, [selectedBranchId, dateFrom, dateTo]);

  const totals = funnel?.totals ?? {};
  const totalLeads = Object.values(totals).reduce((acc, v) => acc + (v ?? 0), 0);
  const newLeads = totals.NEW ?? 0;
  const winRate = funnel?.rates?.win_rate_on_closed ?? 0;
  const qualifiedRate = funnel?.rates?.new_to_qualified ?? 0;
  const series = funnel?.series ?? [];
  const bars = series.slice(-7).map((item, i) => ({
    label: String(item.bucket ?? `P${i + 1}`),
    value: Number(item.NEW ?? 0),
  }));
  const maxBar = Math.max(...bars.map((b) => b.value), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-dispatcher-700">Операционная аналитика диспетчера</h2>
          <p className="mt-1 text-xs text-slate-500">
            Показатели помогают понять, как быстро обрабатываются лиды и где теряются заявки.
          </p>
        </div>
        <select
          value={selectedBranchId}
          onChange={(e) => setSelectedBranchId(e.target.value)}
          className="min-w-[220px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
        >
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </select>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <KpiCard title="Лиды всего" value={totalLeads} icon={<UserGroupIcon className="h-5 w-5 text-dispatcher-600" />} />
        <KpiCard title="Новые лиды" value={newLeads} icon={<UserPlusIcon className="h-5 w-5 text-dispatcher-600" />} />
        <KpiCard title="Win Rate" value={`${winRate.toFixed(1)}%`} icon={<ChartBarIcon className="h-5 w-5 text-dispatcher-600" />} />
        <KpiCard title="NEW→QUALIFIED" value={`${qualifiedRate.toFixed(1)}%`} icon={<ChartBarIcon className="h-5 w-5 text-dispatcher-600" />} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-800">Динамика новых лидов</h3>
          <p className="mt-1 text-xs text-slate-500">
            Сколько новых заявок приходит по неделям. Используется для контроля загрузки команды.
          </p>
          <div className="mt-4 flex h-44 items-end gap-2">
            {bars.map((item) => (
              <div key={item.label} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-t bg-dispatcher-500/80"
                  style={{ height: `${Math.max(12, (item.value / maxBar) * 150)}px` }}
                />
                <div className="max-w-[60px] truncate text-[11px] text-slate-500">{item.label}</div>
              </div>
            ))}
            {!loading && bars.length === 0 && <div className="text-sm text-slate-500">Нет данных</div>}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-800">Распределение по статусам</h3>
          <p className="mt-1 text-xs text-slate-500">
            Где сейчас находятся лиды в воронке: от нового контакта до оплаты или отказа.
          </p>
          <div className="mt-3 space-y-2">
            {Object.entries(totals).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between text-sm">
                <span className="text-slate-600">{FUNNEL_LABELS[status] ?? status}</span>
                <span className="font-medium text-slate-900">{count}</span>
              </div>
            ))}
            {!loading && Object.keys(totals).length === 0 && <div className="text-sm text-slate-500">Нет данных</div>}
          </div>
        </div>
      </div>
    </div>
  );
};

const KpiCard = ({ title, value, icon }: { title: string; value: string | number; icon: React.ReactNode }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <div className="flex items-center justify-between">
      <div className="text-sm text-slate-500">{title}</div>
      {icon}
    </div>
    <div className="mt-2 text-2xl font-bold text-dispatcher-700">{value}</div>
  </div>
);

export default DispatcherDashboard;
