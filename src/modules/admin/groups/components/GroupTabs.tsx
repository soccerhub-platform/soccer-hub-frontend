import React, { useState } from "react";
import GroupCoachesTab from "./GroupCoachesTab";
import GroupScheduleTab from "../schedule/GroupScheduleTab";

type TabId = "coaches" | "schedule";

const TABS: { id: TabId; label: string }[] = [
  { id: "coaches", label: "Тренеры" },
  { id: "schedule", label: "Расписание" },
];

const GroupTabs: React.FC<{ groupId: string }> = ({ groupId }) => {
  const [active, setActive] = useState<"coaches" | "schedule">("coaches");

  return (
    <div className="bg-white rounded-2xl border shadow-sm">
      <div className="flex gap-6 px-6 pt-4 border-b">
        <button onClick={() => setActive("coaches")}>Тренеры</button>
        <button onClick={() => setActive("schedule")}>Расписание</button>
      </div>

      <div className="p-6">
        {active === "coaches" && <GroupCoachesTab groupId={groupId} />}
        {active === "schedule" && <GroupScheduleTab groupId={groupId} />}
      </div>
    </div>
  );
};

export default GroupTabs;