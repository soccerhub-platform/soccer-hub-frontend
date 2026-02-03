import { GroupScheduleDto } from "./schedule.types";
import { DayOfWeek } from "./schedule.types";

export const DAYS: {
  key: DayOfWeek;
  label: string;
  short: string;
}[] = [
  { key: "MONDAY", label: "Понедельник", short: "Пн" },
  { key: "TUESDAY", label: "Вторник", short: "Вт" },
  { key: "WEDNESDAY", label: "Среда", short: "Ср" },
  { key: "THURSDAY", label: "Четверг", short: "Чт" },
  { key: "FRIDAY", label: "Пятница", short: "Пт" },
  { key: "SATURDAY", label: "Суббота", short: "Сб" },
  { key: "SUNDAY", label: "Воскресенье", short: "Вс" },
];
export function toHHmm(time: string) {
  return time?.slice(0, 5);
}

export function groupByDay(schedules: GroupScheduleDto[]) {
  return schedules.reduce<Record<string, GroupScheduleDto[]>>((acc, s) => {
    acc[s.dayOfWeek] = acc[s.dayOfWeek] || [];
    acc[s.dayOfWeek].push(s);
    return acc;
  }, {});
}

export function sortDaySchedules(list: GroupScheduleDto[]) {
  return [...list].sort((a, b) =>
    a.startTime.localeCompare(b.startTime)
  );
}

/* 🔑 Группировка в batch */
export function groupIntoBatches(schedules: GroupScheduleDto[]) {
  const map = new Map<string, GroupScheduleDto[]>();

  schedules.forEach((s) => {
    const key = `${s.coachId}_${s.startDate}_${s.endDate}_${s.scheduleType}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(s);
  });

  return Array.from(map.entries()).map(([key, items]) => ({
    key,
    coachId: items[0].coachId,
    startDate: items[0].startDate,
    endDate: items[0].endDate,
    type: items[0].scheduleType,
    schedules: items,
  }));
}