import React, { useEffect, useMemo, useState } from "react";
import GroupFilters, { GroupHealthFilter } from "./components/GroupFilters";
import GroupsTable from "./components/GroupsTable";
import { useAuth } from "../../../shared/AuthContext";
import {
  GroupApi,
  GroupOverviewResponse,
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
import {
  CheckBadgeIcon,
  ExclamationTriangleIcon,
  PauseCircleIcon,
  PlusIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";

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

  const [filters, setFilters] = useState({
    search: "",
    status: "",
    health: "all" as GroupHealthFilter,
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

      if (filters.health !== "all" && g.health !== filters.health) {
        return false;
      }

      return true;
    });
  }, [overview.groups, filters]);

  const needsAttention =
    overview.summary.withoutCoach +
    overview.summary.withoutSchedule +
    overview.summary.overCapacity;

  if (!token) {
    return <ErrorState message="Нет авторизации" />;
  }

  return (
    <PageShell className="max-w-none space-y-5 px-0 pb-4">
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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          icon={<UserGroupIcon className="h-6 w-6" />}
          label="Все группы"
          value={overview.summary.total}
          hint="в текущем филиале"
          tone="info"
        />
        <Metric
          icon={<CheckBadgeIcon className="h-6 w-6" />}
          label="Активные"
          value={overview.summary.active}
          hint="работают по расписанию"
          tone="success"
        />
        <Metric
          icon={<ExclamationTriangleIcon className="h-6 w-6" />}
          label="Требуют внимания"
          value={needsAttention}
          hint={needsAttention > 0 ? "есть операционные риски" : "рисков не обнаружено"}
          tone={needsAttention > 0 ? "warning" : "success"}
        />
        <Metric
          icon={<PauseCircleIcon className="h-6 w-6" />}
          label="Пауза или стоп"
          value={overview.summary.paused + overview.summary.stopped}
          hint="неактивные группы"
          tone="neutral"
        />
      </div>

      <SectionCard className="p-4 shadow-[0_10px_28px_-25px_rgba(15,23,42,0.45)]">
        <GroupFilters value={filters} onChange={setFilters} />
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
  icon: React.ReactNode;
  label: string;
  value: number;
  hint: string;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
}> = ({ icon, label, value, hint, tone = "neutral" }) => {
  const toneClassName = {
    neutral: "bg-slate-100 text-slate-600",
    success: "bg-emerald-50 text-emerald-700",
    warning: "bg-amber-50 text-amber-700",
    danger: "bg-rose-50 text-rose-700",
    info: "bg-cyan-50 text-cyan-700",
  }[tone];

  return (
    <div className="flex min-h-[96px] items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_26px_-24px_rgba(15,23,42,0.45)]">
      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${toneClassName}`}>
        {icon}
      </span>
      <div className="min-w-0">
        <div className="text-sm font-medium text-slate-600">{label}</div>
        <div className="mt-1 flex items-end gap-2">
          <span className="text-[26px] font-semibold leading-none text-slate-950">{value}</span>
          <span className="pb-0.5 text-xs text-slate-400">{hint}</span>
        </div>
      </div>
    </div>
  );
};

export default GroupsPage;
