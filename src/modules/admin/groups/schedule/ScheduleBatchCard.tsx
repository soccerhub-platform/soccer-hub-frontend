import React from "react";
import { GroupScheduleDto } from "./schedule.types";
import ScheduleWeekView from "./ScheduleWeekView";

interface Props {
  batch: {
    coachId: string;
    coachName?: string;
    startDate: string;
    endDate: string;
    type: "REGULAR" | "TEMPORARY";
    schedules: GroupScheduleDto[];
  };
  onEdit: () => void;
  onDelete: () => void;
}

const ScheduleBatchCard: React.FC<Props> = ({ batch, onEdit, onDelete }) => {
  const sessionsPerWeek = batch.schedules.length;

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-950">
              {batch.type === "REGULAR" ? "Регулярный период" : "Временный период"}
            </h3>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
              Активно
            </span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
              {sessionsPerWeek} занятий / неделя
            </span>
          </div>

          <div className="mt-1 text-xs text-slate-500">
            {batch.startDate} → {batch.endDate || "без даты окончания"}
          </div>
          {batch.coachName ? (
            <div className="mt-1 text-sm text-slate-700">
              Тренер: <span className="font-medium text-slate-950">{batch.coachName}</span>
            </div>
          ) : null}
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Редактировать
          </button>

          <button
            type="button"
            onClick={onDelete}
            className="rounded-xl border border-rose-100 px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50"
          >
            Удалить
          </button>
        </div>
      </div>

      <ScheduleWeekView schedules={batch.schedules} />
    </div>
  );
};

export default ScheduleBatchCard;
