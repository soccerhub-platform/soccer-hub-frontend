import React, { useEffect, useMemo, useState } from "react";
import GroupFilters from "./components/GroupFilters";
import GroupsTable from "./components/GroupsTable";
import { useAuth } from "../../../shared/AuthContext";
import { GroupApi, GroupApiModel } from "./group.api";
import { useAdminBranch } from "../BranchContext";
import CreateGroupModal from "./components/CreateGroupModal";

const GroupsPage: React.FC = () => {
  const { user } = useAuth();
  const token = user?.accessToken!;
  const { branchId } = useAdminBranch();

  const [groups, setGroups] = useState<GroupApiModel[]>([]);
  const [loading, setLoading] = useState(false);

  const [showCreate, setShowCreate] = useState(false);

  const [filters, setFilters] = useState({
    search: "",
    status: "",
  });

  useEffect(() => {
    if (!branchId) return;

    const load = async () => {
      setLoading(true);
      try {
        const data = await GroupApi.listByBranch(branchId, token);
        setGroups(data);
      } catch (e) {
        console.error("Failed to load groups", e);
        setGroups([]);
      } finally {
        setLoading(false);
      }
    };

    load();
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Группы</h1>
          <p className="text-sm text-gray-500 mt-1">
            Управление тренировочными группами
          </p>
        </div>

        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 rounded-xl bg-admin-500 text-white text-sm font-medium hover:bg-admin-700"
        >
          + Создать группу
        </button>
      </div>

      <GroupFilters value={filters} onChange={setFilters} />

      {loading ? (
        <div className="bg-white p-4 rounded-xl border text-sm text-gray-500">
          Загрузка групп…
        </div>
      ) : (
        <GroupsTable groups={filteredGroups} />
      )}

      {showCreate && (
        <CreateGroupModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            // перезагрузка списка
            if (branchId) {
              GroupApi.listByBranch(branchId, token).then(setGroups);
            }
          }}
        />
      )}
    </div>
  );
};

export default GroupsPage;