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
    <div className="rounded-2xl border bg-white p-5 space-y-4">
      {/* HEADER */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">
            {batch.type === "REGULAR"
              ? "Регулярное расписание"
              : "Временное расписание"}
          </h3>

          <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700">
            Активно
          </span>
        </div>

        <div className="text-xs text-gray-500">
          {batch.startDate} → {batch.endDate}
        </div>
      </div>

      {/* META */}
      <div className="text-sm text-gray-700 space-y-1">
        {batch.coachName && (
          <div>
            Тренер: <span className="font-medium">{batch.coachName}</span>
          </div>
        )}
        <div>Нагрузка: {sessionsPerWeek} занятий / неделя</div>
      </div>

      {/* WEEK */}
      <ScheduleWeekView schedules={batch.schedules} />

      {/* ACTIONS */}
      <div className="flex justify-end gap-2 pt-2">
        <button
          onClick={onEdit}
          className="px-4 py-2 text-sm border rounded-xl"
        >
          Редактировать
        </button>

        <button
          onClick={onDelete}
          className="px-4 py-2 text-sm border rounded-xl text-red-600"
        >
          Удалить
        </button>
      </div>
    </div>
  );
};

export default ScheduleBatchCard;