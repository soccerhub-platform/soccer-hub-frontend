import React, { useState } from "react";
import GroupsTable from "./components/GroupsTable";
import GroupFilters from "./components/GroupFilters";

const GroupsPage: React.FC = () => {
  const [filters, setFilters] = useState({
    search: "",
    branchId: "",
    status: "",
  });

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

        <button className="px-4 py-2 rounded-xl bg-admin-500 text-white text-sm font-medium hover:bg-admin-700">
          + Создать группу
        </button>
      </div>

      {/* Filters */}
      <GroupFilters value={filters} onChange={setFilters} />

      {/* Table */}
      <GroupsTable filters={filters} />
    </div>
  );
};

export default GroupsPage;