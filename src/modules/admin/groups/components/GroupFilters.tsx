import React from "react";

interface Filters {
  search: string;
  branchId: string;
  status: string;
}

interface Props {
  value: Filters;
  onChange: (v: Filters) => void;
}

const GroupFilters: React.FC<Props> = ({ value, onChange }) => {
  return (
    <div className="bg-white rounded-2xl border shadow-sm p-4 flex flex-col md:flex-row gap-3">
      {/* Поиск */}
      <input
        type="text"
        placeholder="Поиск по названию группы"
        value={value.search}
        onChange={(e) =>
          onChange({ ...value, search: e.target.value })
        }
        className="flex-1 border rounded-xl px-3 py-2 text-sm"
      />

      {/* Статус */}
      <select
        value={value.status}
        onChange={(e) =>
          onChange({ ...value, status: e.target.value })
        }
        className="border rounded-xl px-3 py-2 text-sm"
      >
        <option value="">Все статусы</option>
        <option value="ACTIVE">Активные</option>
        <option value="PAUSED">На паузе</option>
        <option value="STOPPED">Остановленные</option>
      </select>

      {/* Филиал (пока mock) */}
      <select
        value={value.branchId}
        onChange={(e) =>
          onChange({ ...value, branchId: e.target.value })
        }
        className="border rounded-xl px-3 py-2 text-sm"
      >
        <option value="">Все филиалы</option>
        <option value="b1">Главный филиал</option>
        <option value="b2">Западный филиал</option>
      </select>
    </div>
  );
};

export default GroupFilters;