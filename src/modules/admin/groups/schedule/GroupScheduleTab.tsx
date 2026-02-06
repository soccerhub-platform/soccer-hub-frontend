import React, { useEffect, useState } from "react";
import { useAuth } from "../../../../shared/AuthContext";
import { ScheduleApi } from "./schedule.api";
import { groupSchedulesToBatches } from "./schedule.batch";
import ScheduleBatchCard from "./ScheduleBatchCard";
import EditScheduleModal from "./EditScheduleModal";
import { GroupScheduleDto, ScheduleBatch } from "./schedule.types";
import { GroupApi, GroupCoachApiModel } from "../group.api";
import toast from "react-hot-toast";

const GroupScheduleTab: React.FC<{ groupId: string }> = ({ groupId }) => {
  const { user } = useAuth();
  const token = user?.accessToken;

  const [schedules, setSchedules] = useState<GroupScheduleDto[]>([]);
  const [coaches, setCoaches] = useState<GroupCoachApiModel[]>([]);
  const [editingBatch, setEditingBatch] = useState<ScheduleBatch | null>(null);

  useEffect(() => {
    if (!token) {
      toast.error("Нет авторизации");
      return;
    }
    reload();
    GroupApi.getCoaches(groupId, token).then((r) => setCoaches(r.coaches));
  }, [groupId, token]);

  const reload = async () => {
    if (!token) return;
    const data = await ScheduleApi.listByGroup(groupId, token);
    setSchedules(data);
  };

  /* ===== COACH MAP ===== */

  const coachMap = Object.fromEntries(
    coaches.map((c) => [
      c.coachId,
      `${c.coachFirstName} ${c.coachLastName}${
        c.coachRole === "MAIN" ? " (главный)" : ""
      }`,
    ])
  );

  const coachOptions = coaches.map((c) => ({
    id: c.coachId,
    name: coachMap[c.coachId],
  }));

  /* ===== BATCHES ===== */

  const batches = groupSchedulesToBatches(schedules).map((b) => ({
    ...b,
    coachName: coachMap[b.coachId],
  }));

  if (!token) {
    return <div className="text-sm text-red-500">Нет авторизации</div>;
  }

  return (
    <div className="space-y-5">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <div className="text-sm font-semibold">Расписание группы</div>
          <div className="text-xs text-gray-500">
            Расписания задаются периодами
          </div>
        </div>

        <button
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-admin-500 text-white text-sm"
          onClick={() => {
            if (coachOptions.length === 0) {
              toast.error("Сначала назначьте тренера группе");
              return;
            }

            setEditingBatch({
              key: "new",
              coachId: coachOptions[0].id,
              type: "REGULAR",
              startDate: new Date().toISOString().slice(0, 10),
              endDate: "",
              schedules: [],
            });
          }}
        >
          + Добавить период
        </button>
      </div>

      <hr className="border-t border-gray-200" />

      {/* BATCH LIST */}
      <div className="space-y-4">
        {batches.map((batch) => (
          <ScheduleBatchCard
            key={batch.key}
            batch={batch}
            onEdit={() => setEditingBatch(batch)}
            onDelete={async () => {
              if (!confirm("Удалить период расписания?")) return;

              await ScheduleApi.deleteBatch(
                groupId,
                {
                  coachId: batch.coachId,
                  type: batch.type,
                  startDate: batch.startDate,
                  endDate: batch.endDate,
                },
                token
              );

              await reload();
            }}
          />
        ))}
      </div>

      {/* MODAL */}
      {editingBatch && (
        <EditScheduleModal
          coaches={coachOptions}
          initialCoachId={editingBatch.coachId}
          initialType={editingBatch.type}
          schedules={editingBatch.schedules}
          startDate={editingBatch.startDate}
          endDate={editingBatch.endDate}
          onClose={() => setEditingBatch(null)}
          onSave={async (payload) => {
            if (editingBatch.key === "new") {
              await ScheduleApi.createGroupSchedule(groupId, payload, token);
            } else {
              await ScheduleApi.updateGroupSchedule(groupId, payload, token);
            }
            await reload();
            setEditingBatch(null);
          }}
        />
      )}
    </div>
  );
};

export default GroupScheduleTab;
