import React, { useEffect, useMemo, useState } from "react";
import GroupFilters from "./components/GroupFilters";
import GroupsTable from "./components/GroupsTable";
import { useAuth } from "../../../shared/AuthContext";
import { GroupApi, GroupApiModel } from "./group.api";
import { useAdminBranch } from "../BranchContext";
import CreateGroupModal from "./components/CreateGroupModal";
import {
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  PageShell,
} from "../../../shared/ui";
import { PlusIcon } from "@heroicons/react/24/outline";

const GroupsPage: React.FC = () => {
  const { user } = useAuth();
  const token = user?.accessToken;
  const { branchId } = useAdminBranch();

  const [groups, setGroups] = useState<GroupApiModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);

  const [filters, setFilters] = useState({
    search: "",
    status: "",
  });

  const loadGroups = async () => {
    if (!branchId || !token) return;

    setLoading(true);
    setError(null);
    try {
      const data = await GroupApi.listByBranch(branchId, token);
      setGroups(data);
    } catch (e) {
      console.error("Failed to load groups", e);
      setError("Не удалось загрузить группы");
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadGroups();
  }, [branchId, token]);

  const filteredGroups = useMemo(() => {
    return groups.filter((g) => {
      if (
        filters.search &&
        !g.name.toLowerCase().includes(filters.search.toLowerCase())
      ) {
        return false;
      }

      if (filters.status && g.status !== filters.status) {
        return false;
      }

      return true;
    });
  }, [groups, filters]);

  if (!token) {
    return <ErrorState message="Нет авторизации" />;
  }

  return (
    <PageShell>
      <PageHeader
        title="Группы"
        description="Управление тренировочными группами текущего филиала."
        actions={
          <Button type="button" onClick={() => setShowCreate(true)}>
            <PlusIcon className="h-4 w-4" />
            Создать группу
          </Button>
        }
      />

      <GroupFilters value={filters} onChange={setFilters} />

      {error ? (
        <ErrorState message={error} onRetry={loadGroups} />
      ) : loading ? (
        <LoadingState label="Загрузка групп..." />
      ) : filteredGroups.length === 0 ? (
        <EmptyState
          title="Группы не найдены"
          description="Создайте первую группу или измените фильтры."
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

export default GroupsPage;
