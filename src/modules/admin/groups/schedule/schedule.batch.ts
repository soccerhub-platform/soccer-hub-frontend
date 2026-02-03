import { GroupScheduleDto, ScheduleBatch } from "./schedule.types";

export function groupSchedulesToBatches(
  schedules: GroupScheduleDto[]
): ScheduleBatch[] {
  const map = new Map<string, ScheduleBatch>();

  schedules.forEach((s) => {
    const key = `${s.coachId}_${s.startDate}_${s.endDate}_${s.scheduleType}`;

    if (!map.has(key)) {
      map.set(key, {
        key,
        coachId: s.coachId,
        type: s.scheduleType,
        startDate: s.startDate,
        endDate: s.endDate,
        schedules: [],
      });
    }

    map.get(key)!.schedules.push(s);
  });

  return Array.from(map.values());
}