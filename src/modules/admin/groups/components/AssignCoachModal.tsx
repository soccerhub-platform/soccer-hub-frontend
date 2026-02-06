import React, { useEffect, useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useAuth } from "../../../../shared/AuthContext";
import { CoachApi, Coach } from "../../сoaches/coach.api";
import { GroupApi } from "../group.api";
import toast from "react-hot-toast";

interface Props {
  groupId: string;
  branchId: string;
  assignedCoachIds: string[];
  onClose: () => void;
  onAssigned: () => void;
}

const PAGE_SIZE = 10;

const AssignCoachModal: React.FC<Props> = ({
  groupId,
  branchId,
  assignedCoachIds,
  onClose,
  onAssigned,
}) => {
  const { user } = useAuth();
  const token = user?.accessToken;

  const [data, setData] = useState<any>(null);
  const [page, setPage] = useState(0);
  const [assigningId, setAssigningId] = useState<string | null>(null);

  /** роль по coachId */
  const [roles, setRoles] = useState<Record<string, "MAIN" | "ASSISTANT">>({});

  const load = async () => {
    if (!token) {
      toast.error("Нет авторизации");
      return;
    }
    const res = await CoachApi.listByBranch(
      branchId,
      token,
      page,
      PAGE_SIZE
    );
    setData(res);
  };

  useEffect(() => {
    load();
  }, [page, branchId, token]);

  const assign = async (coachId: string) => {
    if (!token) {
      toast.error("Нет авторизации");
      return;
    }
    const role = roles[coachId] ?? "ASSISTANT";

    setAssigningId(coachId);
    try {
      await GroupApi.assignCoach(groupId, coachId, role, token);
      onAssigned();
      onClose();
    } catch (e: any) {
      if (e.message?.includes("already assigned")) {
        toast.error("Тренер уже назначен в эту группу");
      } else {
        toast.error("Не удалось назначить тренера");
      }
    } finally {
      setAssigningId(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
      <div className="bg-white w-full max-w-lg rounded-2xl p-6">
        {/* HEADER */}
        <div className="flex justify-between mb-4">
          <h3 className="font-semibold">Назначить тренера</h3>
          <button onClick={onClose}>
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* LIST */}
        <div className="space-y-2 max-h-80 overflow-auto">
          {data?.content.map((coach: Coach) => {
            const assigned = assignedCoachIds.includes(coach.id);

            return (
              <div
                key={coach.id}
                className="flex items-center justify-between gap-3 border rounded-xl px-4 py-3"
              >
                <div>
                  <div className="font-medium">
                    {coach.firstName} {coach.lastName}
                  </div>
                  <div className="text-xs text-gray-500">
                    {coach.email}
                  </div>
                </div>

                {!assigned && (
                  <select
                    value={roles[coach.id] ?? "ASSISTANT"}
                    onChange={(e) =>
                      setRoles((prev) => ({
                        ...prev,
                        [coach.id]: e.target.value as "MAIN" | "ASSISTANT",
                      }))
                    }
                    className="text-xs px-2 py-1 border rounded-lg"
                  >
                    <option value="MAIN">Главный</option>
                    <option value="ASSISTANT">Ассистент</option>
                  </select>
                )}

                <button
                  disabled={assigned || assigningId === coach.id}
                  onClick={() => assign(coach.id)}
                  className={`
                    px-3 py-1.5 rounded-lg text-sm
                    ${
                      assigned
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-admin-500 text-white hover:bg-admin-700"
                    }
                  `}
                >
                  {assigned ? "Уже в группе" : "Назначить"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AssignCoachModal;
