import React, { useState } from "react";
import { Group } from "../types";
import GroupCoachesTab from "./GroupCoachesTab";
import GroupScheduleTab from "./GroupScheduleTab";

type TabId = "coaches" | "schedule";

const TABS: { id: TabId; label: string }[] = [
  { id: "coaches", label: "Тренеры" },
  { id: "schedule", label: "Расписание" },
];

const GroupTabs: React.FC<{ group: Group }> = ({ group }) => {
  const [active, setActive] = useState<TabId>("coaches");

  return (
    <div className="bg-white rounded-2xl border shadow-sm">
      {/* Tabs header */}
      <div className="flex gap-6 px-6 pt-4 border-b">
        {TABS.map((tab) => {
          const isActive = active === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActive(tab.id)}
              className={`
                pb-3 text-sm font-medium transition
                ${
                  isActive
                    ? "text-admin-700 border-b-2 border-admin-500"
                    : "text-gray-500 hover:text-gray-700"
                }
              `}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="p-6">
        {active === "coaches" && (
          <GroupCoachesTab groupId={group.id} />
        )}

        {active === "schedule" && (
          <GroupScheduleTab groupId={group.id} />
        )}
      </div>
    </div>
  );
};

export default GroupTabs;