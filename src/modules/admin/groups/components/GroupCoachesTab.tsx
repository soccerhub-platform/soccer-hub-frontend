import React, { useEffect, useState } from "react";
import {
  EnvelopeIcon,
  PhoneIcon,
  UserMinusIcon,
} from "@heroicons/react/24/outline";
import { Coach } from "../types";

interface Props {
  groupId: string;
}

const MOCK_COACHES: Coach[] = [
  {
    id: "f3728a56-e558-4f91-ad11-035124fcdc2e",
    firstName: "Arsen",
    lastName: "Gizatov",
    phone: "+77757008463",
    email: "arsen.gizatov@fc.com",
    active: true,
  },
];

const GroupCoachesTab: React.FC<Props> = ({ groupId }) => {
  const [coaches, setCoaches] = useState<Coach[]>([]);

  useEffect(() => {
    // TODO: заменить на API
    // GET /organization/groups/{groupId}/coaches
    setCoaches(MOCK_COACHES);
  }, [groupId]);

  const removeCoach = (coachId: string) => {
    setCoaches((prev) => prev.filter((c) => c.id !== coachId));
  };

  return (
    <div className="space-y-4">
      {coaches.length === 0 && (
        <div className="text-sm text-gray-500">
          Тренеры не назначены
        </div>
      )}

      {coaches.map((coach) => (
        <div
          key={coach.id}
          className="flex items-center justify-between border rounded-xl px-4 py-3"
        >
          <div>
            <div className="font-medium">
              {coach.firstName} {coach.lastName}
            </div>
            <div className="mt-1 text-xs text-gray-500 space-y-1">
              <div className="flex items-center gap-1">
                <EnvelopeIcon className="h-4 w-4" />
                {coach.email}
              </div>
              <div className="flex items-center gap-1">
                <PhoneIcon className="h-4 w-4" />
                {coach.phone}
              </div>
            </div>
          </div>

          <button
            onClick={() => removeCoach(coach.id)}
            className="text-red-500 hover:text-red-700"
          >
            <UserMinusIcon className="h-5 w-5" />
          </button>
        </div>
      ))}

      <button
        className="w-full py-2 rounded-xl border border-dashed text-sm hover:bg-gray-50"
        onClick={() => alert("Открыть AssignCoachModal")}
      >
        + Назначить тренера
      </button>
    </div>
  );
};

export default GroupCoachesTab;