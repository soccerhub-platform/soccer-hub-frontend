import React from "react";
import { GroupScheduleDto } from "./schedule.types";
import { DAYS, groupByDay, sortDaySchedules, toHHmm } from "./schedule.utils";

const ScheduleWeekView: React.FC<{ schedules: GroupScheduleDto[] }> = ({
  schedules,
}) => {
  const byDay = groupByDay(schedules);

  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[620px] grid-cols-7 gap-2">
      {DAYS.map((day) => {
        const list = sortDaySchedules(byDay[day.key] ?? []);

        return (
          <div
            key={day.key}
            className={`min-h-[66px] rounded-lg border p-2
              ${list.length === 0 ? "border-dashed bg-slate-50" : "bg-white"}
            `}
          >
            <div className="mb-1.5 flex justify-between">
              <span className="text-xs font-semibold">{day.short}</span>
            </div>

            {list.length === 0 ? (
              <div className="mt-2 text-center text-xs text-gray-400">—</div>
            ) : (
              <div className="space-y-2">
                {list.map((s) => (
                  <div
                    key={s.scheduleId}
                    className="rounded-md bg-cyan-50 px-1.5 py-1"
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
    </div>
  );
};

export default ScheduleWeekView;
