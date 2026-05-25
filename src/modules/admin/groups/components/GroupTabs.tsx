import React, { useEffect, useState } from "react";
import {
  CalendarDaysIcon,
  UsersIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import { useSearchParams } from "react-router-dom";
import GroupCoachesTab from "./GroupCoachesTab";
import GroupScheduleTab from "../schedule/GroupScheduleTab";
import GroupMembersTab from "./GroupMembersTab";

const GroupTabs: React.FC<{ groupId: string }> = ({ groupId }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get("tab");
  const initialTab =
    tabFromUrl === "coaches" || tabFromUrl === "schedule" || tabFromUrl === "members"
      ? tabFromUrl
      : "members";
  const [active, setActive] = useState<"members" | "coaches" | "schedule">(initialTab);

  useEffect(() => {
    setActive(initialTab);
  }, [initialTab]);
  const tabs = [
    {
      key: "members" as const,
      label: "Состав",
      description: "Ученики и контракты",
      icon: UsersIcon,
    },
    {
      key: "coaches" as const,
      label: "Тренеры",
      description: "Ответственные за группу",
      icon: UserCircleIcon,
    },
    {
      key: "schedule" as const,
      label: "Расписание",
      description: "Дни и время занятий",
      icon: CalendarDaysIcon,
    },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="grid grid-cols-1 gap-2 border-b border-slate-200 bg-slate-50 p-2 sm:grid-cols-3">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = active === tab.key;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setActive(tab.key);
                const next = new URLSearchParams(searchParams);
                next.set("tab", tab.key);
                setSearchParams(next, { replace: true });
              }}
              className={`flex items-start gap-3 rounded-xl px-4 py-3 text-left transition ${
                isActive
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:bg-white/70 hover:text-slate-800"
              }`}
            >
              <Icon className={`mt-0.5 h-5 w-5 ${isActive ? "text-cyan-800" : "text-slate-400"}`} />
              <span>
                <span className="block text-sm font-semibold">{tab.label}</span>
                <span className="mt-0.5 block text-xs text-slate-500">{tab.description}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="p-4 sm:p-6">
        {active === "members" && <GroupMembersTab groupId={groupId} />}
        {active === "coaches" && <GroupCoachesTab groupId={groupId} />}
        {active === "schedule" && <GroupScheduleTab groupId={groupId} />}
      </div>
    </div>
  );
};

export default GroupTabs;
