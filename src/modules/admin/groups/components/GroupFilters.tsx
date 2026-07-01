import React from "react";

interface Props {
  value: {
    search: string;
    status: string;
  };
  onChange: (v: Props["value"]) => void;
}

const GroupFilters: React.FC<Props> = ({ value, onChange }) => {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(260px,1fr)_180px]">
      <input
        type="text"
        placeholder="Поиск по названию группы"
        value={value.search}
        onChange={(e) =>
          onChange({ ...value, search: e.target.value })
        }
        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100"
      />

      <select
        value={value.status}
        onChange={(e) =>
          onChange({ ...value, status: e.target.value })
        }
        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100"
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
