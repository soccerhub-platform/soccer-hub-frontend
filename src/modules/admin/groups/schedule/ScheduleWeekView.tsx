import React from "react";
import { GroupScheduleDto } from "./schedule.types";
import { DAYS, groupByDay, sortDaySchedules, toHHmm } from "./schedule.utils";

const ScheduleWeekView: React.FC<{ schedules: GroupScheduleDto[] }> = ({
  schedules,
}) => {
  const byDay = groupByDay(schedules);

  return (
    <div className="grid grid-cols-7 gap-3">
      {DAYS.map((day) => {
        const list = sortDaySchedules(byDay[day.key] ?? []);

        return (
          <div
            key={day.key}
            className={`rounded-xl border p-3 min-h-[96px]
              ${list.length === 0 ? "bg-gray-50 border-dashed" : "bg-white"}
            `}
          >
            <div className="flex justify-between mb-2">
              <span className="text-xs font-semibold">{day.short}</span>
              <span className="text-[10px] text-gray-400">{day.label}</span>
            </div>

            {list.length === 0 ? (
              <div className="text-xs text-gray-400 text-center mt-6">—</div>
            ) : (
              <div className="space-y-2">
                {list.map((s) => (
                  <div
                    key={s.scheduleId}
                    className="rounded-lg bg-admin-100 px-2 py-1.5"
                  >
                    <div className="text-xs font-semibold text-admin-800">
                      {toHHmm(s.startTime)} – {toHHmm(s.endTime)}
                    </div>
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