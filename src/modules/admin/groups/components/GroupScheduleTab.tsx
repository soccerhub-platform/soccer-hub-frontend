import React, { useEffect, useState } from "react";
import ScheduleWeekView from "../schedule/ScheduleWeekView";
import { GroupScheduleDto } from "../types";

interface Props {
  groupId: string;
}

const MOCK_SCHEDULE: GroupScheduleDto[] = [
  {
    scheduleId: "1",
    groupId: "g1",
    coachId: "c1",
    branchId: "b1",
    dayOfWeek: "MONDAY",
    startTime: "17:00",
    endTime: "18:30",
    startDate: "2025-01-01",
    endDate: "2025-06-01",
    scheduleType: "REGULAR",
    status: "ACTIVE",
    substitution: false,
    substitutionCoachId: null,
  },
  {
    scheduleId: "2",
    groupId: "g1",
    coachId: "c1",
    branchId: "b1",
    dayOfWeek: "WEDNESDAY",
    startTime: "17:00",
    endTime: "18:30",
    startDate: "2025-01-01",
    endDate: "2025-06-01",
    scheduleType: "REGULAR",
    status: "ACTIVE",
    substitution: false,
    substitutionCoachId: null,
  },
];

const GroupScheduleTab: React.FC<Props> = ({ groupId }) => {
  const [schedule, setSchedule] = useState<GroupScheduleDto[]>([]);

  useEffect(() => {
    // TODO:
    // GET /organization/groups/{groupId}/schedule
    setSchedule(MOCK_SCHEDULE);
  }, [groupId]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-sm font-semibold">Расписание группы</h3>
          <p className="text-xs text-gray-500">
            Повторяющееся недельное расписание
          </p>
        </div>

        <button className="px-3 py-1.5 rounded-lg text-xs bg-admin-500 text-white">
          ✎ Редактировать
        </button>
      </div>

      <ScheduleWeekView schedules={schedule} />
    </div>
  );
};

export default GroupScheduleTab;