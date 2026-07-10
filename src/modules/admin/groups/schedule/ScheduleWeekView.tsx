import React from "react";
import { GroupScheduleDto } from "./schedule.types";
import { DAYS, groupByDay, sortDaySchedules, toHHmm } from "./schedule.utils";

const ScheduleWeekView: React.FC<{ schedules: GroupScheduleDto[] }> = ({
  schedules,
}) => {
  const byDay = groupByDay(schedules);

  return (
    <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
      {DAYS.map((day) => {
        const list = sortDaySchedules(byDay[day.key] ?? []);

        return (
          <div
            key={day.key}
            className={`min-h-[96px] rounded-xl border p-3
              ${list.length === 0 ? "border-dashed bg-slate-50" : "bg-white"}
            `}
          >
            <div className="mb-2 flex justify-between">
              <span className="text-xs font-semibold">{day.short}</span>
              <span className="text-[10px] text-gray-400">{day.label}</span>
            </div>

            {list.length === 0 ? (
              <div className="mt-6 text-center text-xs text-gray-400">—</div>
            ) : (
              <div className="space-y-2">
                {list.map((s) => (
                  <div
                    key={s.scheduleId}
                    className="rounded-lg bg-cyan-50 px-2 py-1.5"
                  >
                    <div className="text-xs font-semibold text-cyan-800">
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
