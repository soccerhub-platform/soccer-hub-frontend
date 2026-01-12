import React from "react";

interface Filters {
  search: string;
  status: string;
}

interface Props {
  value: {
    search: string;
    status: string;
  };
  onChange: (v: Props["value"]) => void;
}

const GroupFilters: React.FC<Props> = ({ value, onChange }) => {
  return (
    <div className="bg-white rounded-2xl border shadow-sm p-4 flex gap-3">
      <input
        type="text"
        placeholder="Поиск по названию группы"
        value={value.search}
        onChange={(e) =>
          onChange({ ...value, search: e.target.value })
        }
        className="flex-1 border rounded-xl px-3 py-2 text-sm"
      />

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
    </div>
  );
};

export default GroupFilters;