import React, { useEffect, useState } from "react";
import { useAuth } from "../../../../shared/AuthContext";
import { ScheduleApi } from "./schedule.api";
import { groupSchedulesToBatches } from "./schedule.batch";
import ScheduleBatchCard from "./ScheduleBatchCard";
import EditScheduleModal from "./EditScheduleModal";
import { GroupScheduleDto, ScheduleBatch } from "./schedule.types";
import {
  GroupApi,
  GroupCoachApiModel,
  GroupScheduleRisksResponse,
} from "../group.api";
import toast from "react-hot-toast";
import {
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
} from "../../../../shared/ui";
import {
  CalendarDaysIcon,
  ExclamationTriangleIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";

const GroupScheduleTab: React.FC<{ groupId: string }> = ({ groupId }) => {
  const { user } = useAuth();
  const token = user?.accessToken;

  const [schedules, setSchedules] = useState<GroupScheduleDto[]>([]);
  const [coaches, setCoaches] = useState<GroupCoachApiModel[]>([]);
  const [risks, setRisks] = useState<GroupScheduleRisksResponse | null>(null);
  const [editingBatch, setEditingBatch] = useState<ScheduleBatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      toast.error("Нет авторизации");
      return;
    }
    void reload();
    GroupApi.getCoaches(groupId, token)
      .then((r) => setCoaches(r.coaches))
      .catch((e) => {
        console.error("Failed to load group coaches", e);
        toast.error("Не удалось загрузить тренеров группы");
      });
  }, [groupId, token]);

  const reload = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [data, risksData] = await Promise.all([
        ScheduleApi.listByGroup(groupId, token),
        GroupApi.getScheduleRisks(groupId, token),
      ]);
      setSchedules(data);
      setRisks(risksData);
    } catch (e) {
      console.error("Failed to load group schedule", e);
      setError("Не удалось загрузить расписание группы");
      setSchedules([]);
      setRisks(null);
    } finally {
      setLoading(false);
    }
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
    return <ErrorState message="Нет авторизации" />;
  }

  const formatSessionDateTime = (value: string | null) => {
    if (!value) return "Нет ближайших занятий";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat("ru-RU", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  };

  return (
    <div className="space-y-5">
      {/* HEADER */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-semibold text-slate-900">Расписание группы</div>
          <div className="text-xs text-slate-500">
            Задайте период, дни недели и ответственного тренера
          </div>
        </div>

        <Button
          type="button"
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
          <PlusIcon className="h-4 w-4" />
          Добавить период
        </Button>
      </div>

      {risks ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div
            className={`rounded-xl border px-3 py-3 text-sm ${
              risks.hasConflicts
                ? "border-rose-200 bg-rose-50 text-rose-800"
                : "border-emerald-200 bg-emerald-50 text-emerald-800"
            }`}
          >
            <div className="mb-1 flex items-center gap-2 font-semibold">
              <ExclamationTriangleIcon className="h-4 w-4" />
              Конфликты расписания
            </div>
            <div>
              {risks.hasConflicts
                ? `Найдено конфликтов: ${risks.conflictsCount}`
                : "Конфликтов не обнаружено"}
            </div>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900">
            <div className="mb-1 flex items-center gap-2 font-semibold">
              <CalendarDaysIcon className="h-4 w-4" />
              Дни без занятий
            </div>
            <div>{risks.emptyDaysCount}</div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
            <div className="mb-1 font-semibold text-slate-900">Следующее занятие</div>
            <div>{formatSessionDateTime(risks.nextSessionAt)}</div>
          </div>
        </div>
      ) : null}

      {/* BATCH LIST */}
      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : loading ? (
        <LoadingState label="Загрузка расписания..." />
      ) : batches.length === 0 ? (
        <EmptyState
          title="Расписание не создано"
          description="Добавьте период расписания, чтобы тренировки появились у тренера."
          action={
            <Button
              type="button"
              size="sm"
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
              <PlusIcon className="h-4 w-4" />
              Добавить период
            </Button>
          }
        />
      ) : (
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
      )}

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
