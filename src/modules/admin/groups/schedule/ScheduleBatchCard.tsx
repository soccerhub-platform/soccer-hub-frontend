import React from "react";
import { NoSymbolIcon, PencilSquareIcon } from "@heroicons/react/24/outline";
import { GroupScheduleDto } from "./schedule.types";
import ScheduleWeekView from "./ScheduleWeekView";
import CoachProfileLink from "../components/CoachProfileLink";

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
  onFinish: () => void;
}

const ScheduleBatchCard: React.FC<Props> = ({ batch, onEdit, onFinish }) => {
  const sessionsPerWeek = batch.schedules.length;

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
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
              Тренер: <CoachProfileLink coachId={batch.coachId}>{batch.coachName}</CoachProfileLink>
            </div>
          ) : null}
        </div>

        <div className="flex justify-end gap-1.5">
          <button
            type="button"
            onClick={onEdit}
            title="Редактировать период"
            aria-label="Редактировать период"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            <PencilSquareIcon className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={onFinish}
            title="Завершить период"
            aria-label="Завершить период"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-rose-100 text-rose-600 hover:bg-rose-50"
          >
            <NoSymbolIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      <ScheduleWeekView schedules={batch.schedules} />
    </div>
  );
};

export default ScheduleBatchCard;
