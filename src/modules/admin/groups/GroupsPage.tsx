import React, { useEffect, useMemo, useState } from "react";
import GroupFilters from "./components/GroupFilters";
import GroupsTable from "./components/GroupsTable";
import { useAuth } from "../../../shared/AuthContext";
import {
  GroupApi,
  GroupOverviewResponse,
  GroupHealth,
} from "./group.api";
import { useAdminBranch } from "../BranchContext";
import CreateGroupModal from "./components/CreateGroupModal";
import {
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  PageShell,
  SectionCard,
} from "../../../shared/ui";
import { PlusIcon } from "@heroicons/react/24/outline";

type GroupFilter = "all" | GroupHealth;

const emptyOverview: GroupOverviewResponse = {
  summary: {
    total: 0,
    active: 0,
    paused: 0,
    stopped: 0,
    withoutCoach: 0,
    withoutSchedule: 0,
    overCapacity: 0,
  },
  groups: [],
};

const GroupsPage: React.FC = () => {
  const { user } = useAuth();
  const token = user?.accessToken;
  const { branchId } = useAdminBranch();

  const [overview, setOverview] = useState<GroupOverviewResponse>(emptyOverview);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [healthFilter, setHealthFilter] = useState<GroupFilter>("all");

  const [filters, setFilters] = useState({
    search: "",
    status: "",
  });

  const loadGroups = async () => {
    if (!branchId || !token) return;

    setLoading(true);
    setError(null);
    try {
      const data = await GroupApi.overview(branchId, token);
      setOverview({
        summary: data.summary ?? emptyOverview.summary,
        groups: data.groups ?? [],
      });
    } catch (e) {
      console.error("Failed to load groups", e);
      setError("Не удалось загрузить группы");
      setOverview(emptyOverview);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadGroups();
  }, [branchId, token]);

  const filteredGroups = useMemo(() => {
    return overview.groups.filter((g) => {
      if (
        filters.search &&
        !g.name.toLowerCase().includes(filters.search.toLowerCase())
      ) {
        return false;
      }

      if (filters.status && g.status !== filters.status) {
        return false;
      }

      if (healthFilter !== "all" && g.health !== healthFilter) {
        return false;
      }

      return true;
    });
  }, [overview.groups, filters, healthFilter]);

  if (!token) {
    return <ErrorState message="Нет авторизации" />;
  }

  return (
    <PageShell>
      <PageHeader
        title="Группы"
        description="Операционный обзор групп: состояние, риски и действия."
        actions={
          <Button type="button" onClick={() => setShowCreate(true)}>
            <PlusIcon className="h-4 w-4" />
            Создать группу
          </Button>
        }
      />

      <SectionCard className="p-3" bodyClassName="space-y-3">
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Metric label="Всего" value={overview.summary.total} />
          <Metric label="Активны" value={overview.summary.active} tone="success" />
          <Metric label="Пауза" value={overview.summary.paused} tone="warning" />
          <Metric label="Стоп" value={overview.summary.stopped} tone="danger" />
          <Metric label="Без тренера" value={overview.summary.withoutCoach} tone="warning" />
          <Metric label="Без расписания" value={overview.summary.withoutSchedule} tone="warning" />
          <Metric label="Переполнены" value={overview.summary.overCapacity} tone="danger" />
        </div>

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_auto] xl:items-end">
          <GroupFilters value={filters} onChange={setFilters} />

          <div className="flex flex-wrap gap-2">
            {[
              ["all", "Все"],
              ["NO_COACH", "Нет тренера"],
              ["NO_SCHEDULE", "Нет расписания"],
              ["OVER_CAPACITY", "Переполнены"],
              ["PAUSED", "Пауза"],
              ["STOPPED", "Стоп"],
              ["OK", "OK"],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setHealthFilter(key as GroupFilter)}
                className={`rounded-full border px-3 py-2 text-xs font-medium transition ${
                  healthFilter === key
                    ? "border-cyan-200 bg-cyan-50 text-cyan-800"
                    : "border-slate-200 bg-white text-slate-500 hover:text-slate-800"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </SectionCard>

      {error ? (
        <ErrorState message={error} onRetry={loadGroups} />
      ) : loading ? (
        <LoadingState label="Загрузка групп..." />
      ) : filteredGroups.length === 0 ? (
        <EmptyState
          title="Группы не найдены"
          description="Измените фильтры или создайте новую группу."
        />
      ) : (
        <GroupsTable groups={filteredGroups} />
      )}

      {showCreate && (
        <CreateGroupModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            void loadGroups();
          }}
        />
      )}
    </PageShell>
  );
};

const Metric: React.FC<{
  label: string;
  value: number;
  tone?: "neutral" | "success" | "warning" | "danger";
}> = ({ label, value, tone = "neutral" }) => {
  const valueClass =
    tone === "success"
      ? "text-emerald-700"
      : tone === "warning"
      ? "text-amber-700"
      : tone === "danger"
      ? "text-rose-700"
      : "text-slate-900";

  return (
    <div className="flex min-w-[118px] shrink-0 items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
      <div className="text-[11px] font-medium uppercase text-slate-500">{label}</div>
      <div className={`text-lg font-semibold ${valueClass}`}>{value}</div>
    </div>
  );
};

export default GroupsPage;
