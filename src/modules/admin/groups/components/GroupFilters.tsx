import React from "react";
import {
  AdjustmentsHorizontalIcon,
  ChevronDownIcon,
  MagnifyingGlassIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import { GroupHealth } from "../group.api";

export type GroupHealthFilter = "all" | GroupHealth;

interface Props {
  value: {
    search: string;
    status: string;
    health: GroupHealthFilter;
  };
  onChange: (v: Props["value"]) => void;
}

const GroupFilters: React.FC<Props> = ({ value, onChange }) => {
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(280px,1fr)_190px_220px]">
      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-slate-500">
          Поиск
        </span>
        <span className="relative block">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Название группы"
            value={value.search}
            onChange={(e) =>
              onChange({ ...value, search: e.target.value })
            }
            className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
          />
        </span>
      </label>

      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-slate-500">
          Статус
        </span>
        <span className="relative block">
          <AdjustmentsHorizontalIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <select
            value={value.status}
            onChange={(e) =>
              onChange({ ...value, status: e.target.value })
            }
            className="h-10 w-full appearance-none rounded-lg border border-slate-200 bg-white pl-9 pr-9 text-sm outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
          >
            <option value="">Все статусы</option>
            <option value="ACTIVE">Активные</option>
            <option value="PAUSED">На паузе</option>
            <option value="STOPPED">Остановленные</option>
          </select>
          <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        </span>
      </label>

      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-slate-500">
          Состояние
        </span>
        <span className="relative block">
          <ShieldCheckIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <select
            value={value.health}
            onChange={(e) =>
              onChange({ ...value, health: e.target.value as GroupHealthFilter })
            }
            className="h-10 w-full appearance-none rounded-lg border border-slate-200 bg-white pl-9 pr-9 text-sm outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
          >
            <option value="all">Все состояния</option>
            <option value="NO_COACH">Без тренера</option>
            <option value="NO_SCHEDULE">Без расписания</option>
            <option value="OVER_CAPACITY">Переполнены</option>
            <option value="PAUSED">На паузе</option>
            <option value="STOPPED">Остановлены</option>
            <option value="OK">Без проблем</option>
          </select>
          <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        </span>
      </label>
    </div>
  );
};

export default GroupFilters;
