import React from "react";
import { GroupScheduleDto, DAY_LABELS } from "../types";

interface Props {
  schedules: GroupScheduleDto[];
}

const DAYS = Object.keys(DAY_LABELS) as GroupScheduleDto["dayOfWeek"][];

const ScheduleWeekView: React.FC<Props> = ({ schedules }) => {
  return (
    <div className="grid grid-cols-5 gap-3 text-sm">
      {DAYS.map((day) => {
        const daySchedules = schedules.filter(
          (s) => s.dayOfWeek === day && s.status === "ACTIVE"
        );

        return (
          <div
            key={day}
            className="border rounded-xl p-3 min-h-[120px]"
          >
            <div className="font-semibold mb-2">
              {DAY_LABELS[day]}
            </div>

            {daySchedules.length === 0 ? (
              <div className="text-xs text-gray-400">
                Нет тренировок
              </div>
            ) : (
              <div className="space-y-2">
                {daySchedules.map((s) => (
                  <div
                    key={s.scheduleId}
                    className="bg-admin-50 rounded-lg px-2 py-1 text-xs"
                  >
                    <div className="font-medium">
                      {s.startTime} – {s.endTime}
                    </div>

                    {s.substitution && (
                      <div className="text-orange-600">
                        Замена тренера
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ScheduleWeekView;