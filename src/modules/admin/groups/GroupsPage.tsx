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
  MetricCard,
  PageHeader,
  PageShell,
  SectionCard,
} from "../../../shared/ui";
import {
  BadgeCheck,
  TriangleAlert,
  PauseCircle,
  Plus,
  Users,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";

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
  const [searchParams, setSearchParams] = useSearchParams();

  const [overview, setOverview] = useState<GroupOverviewResponse>(emptyOverview);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showCreate = searchParams.get("drawer") === "create-group";

  const openCreate = () => {
    const next = new URLSearchParams(searchParams);
    next.set("drawer", "create-group");
    setSearchParams(next);
  };

  const closeCreate = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("drawer");
    setSearchParams(next, { replace: true });
  };

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
    <PageShell>
      <PageHeader
        title="Группы"
        description="Операционный обзор групп: состояние, риски и действия."
        actions={
          <Button type="button" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Создать группу
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={<Users className="h-6 w-6" />}
          title="Все группы"
          value={overview.summary.total}
          note="в текущем филиале"
          tone="info"
        />
        <MetricCard
          icon={<BadgeCheck className="h-6 w-6" />}
          title="Активные"
          value={overview.summary.active}
          note="работают по расписанию"
          tone="success"
        />
        <MetricCard
          icon={<TriangleAlert className="h-6 w-6" />}
          title="Требуют внимания"
          value={needsAttention}
          note={needsAttention > 0 ? "есть операционные риски" : "рисков не обнаружено"}
          tone={needsAttention > 0 ? "warning" : "success"}
        />
        <MetricCard
          icon={<PauseCircle className="h-6 w-6" />}
          title="Пауза или стоп"
          value={overview.summary.paused + overview.summary.stopped}
          note="неактивные группы"
          tone="neutral"
        />
      </div>

      <SectionCard className="p-4">
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
          onClose={closeCreate}
          onCreated={() => {
            closeCreate();
            void loadGroups();
          }}
        />
      )}
    </PageShell>
  );
};

export default GroupsPage;
