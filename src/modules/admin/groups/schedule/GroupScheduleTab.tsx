import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../../shared/AuthContext";
import { ScheduleApi } from "./schedule.api";
import { groupSchedulesToBatches } from "./schedule.batch";
import ScheduleBatchCard from "./ScheduleBatchCard";
import EditScheduleModal from "./EditScheduleModal";
import {
  GroupScheduleDto,
  ScheduleBatch,
  ScheduleValidationResult,
  UpdateScheduleBatchCommand,
} from "./schedule.types";
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
  ClockIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import { AdminSessionApi, AdminSessionListItem, AdminSessionEffectiveStatus } from "../session.api";

const weekDays = [
  { key: "MONDAY", label: "Пн" },
  { key: "TUESDAY", label: "Вт" },
  { key: "WEDNESDAY", label: "Ср" },
  { key: "THURSDAY", label: "Чт" },
  { key: "FRIDAY", label: "Пт" },
  { key: "SATURDAY", label: "Сб" },
  { key: "SUNDAY", label: "Вс" },
] as const;

const toTime = (value: string) => value.slice(0, 5);

const toDateInput = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getMonthRange = () => {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { from: toDateInput(from), to: toDateInput(to) };
};

const sessionStatusLabels: Record<AdminSessionEffectiveStatus, string> = {
  PLANNED: "Запланировано",
  IN_PROGRESS: "Идет",
  COMPLETED: "Завершено",
  CANCELLED: "Отменено",
  OVERDUE: "Просрочено",
};

const sessionStatusClasses: Record<AdminSessionEffectiveStatus, string> = {
  PLANNED: "border-cyan-100 bg-cyan-50 text-cyan-800",
  IN_PROGRESS: "border-emerald-100 bg-emerald-50 text-emerald-700",
  COMPLETED: "border-slate-200 bg-slate-50 text-slate-600",
  CANCELLED: "border-rose-100 bg-rose-50 text-rose-700",
  OVERDUE: "border-amber-100 bg-amber-50 text-amber-800",
};

const formatSessionDate = (value: string) => {
  const [datePart] = value.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const date = year && month && day ? new Date(year, month - 1, day) : new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
  }).format(date);
};

const formatSessionTime = (value: string) => {
  return value.split("T")[1]?.slice(0, 5) ?? value.slice(11, 16);
};

const GroupScheduleTab: React.FC<{ groupId: string }> = ({ groupId }) => {
  const { user } = useAuth();
  const token = user?.accessToken;
  const navigate = useNavigate();

  const [schedules, setSchedules] = useState<GroupScheduleDto[]>([]);
  const [sessions, setSessions] = useState<AdminSessionListItem[]>([]);
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
      const range = getMonthRange();
      const sessionsData = await AdminSessionApi.listByGroup(groupId, range, token).catch((sessionError) => {
        console.error("Failed to load materialized group sessions", sessionError);
        return null;
      });
      setSessions(sessionsData?.items ?? []);
    } catch (e) {
      console.error("Failed to load group schedule", e);
      setError("Не удалось загрузить расписание группы");
      setSchedules([]);
      setSessions([]);
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
  const activeSchedules = schedules.filter((schedule) => schedule.status !== "CANCELLED");
  const upcomingSessions = sessions
    .slice()
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    .slice(0, 8);
  const weeklyScheduleByDay = weekDays.map((day) => ({
    ...day,
    items: activeSchedules
      .filter((schedule) => schedule.dayOfWeek === day.key)
      .slice()
      .sort((a, b) => a.startTime.localeCompare(b.startTime)),
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

  const validateAndSaveBatch = async (
    payload: UpdateScheduleBatchCommand
  ): Promise<ScheduleValidationResult> => {
    const validationPayload = {
      ...payload,
      ...(editingBatch && editingBatch.key !== "new"
        ? { excludeScheduleIds: editingBatch.schedules.map((schedule) => schedule.scheduleId) }
        : {}),
    };

    const validation = await ScheduleApi.validateGroupSchedule(
      groupId,
      validationPayload,
      token
    );

    if (!validation.valid) {
      return validation;
    }

    if (editingBatch?.key === "new") {
      await ScheduleApi.createGroupSchedule(groupId, payload, token);
    } else {
      await ScheduleApi.updateGroupSchedule(groupId, payload, token);
    }
    await reload();
    setEditingBatch(null);

    return validation;
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-base font-semibold text-slate-950">Расписание группы</div>
          <div className="mt-1 max-w-2xl text-sm text-slate-500">
            Сначала недельная картина для контроля, ниже периоды расписания для редактирования.
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
            className={`rounded-2xl border px-4 py-3 text-sm ${
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

          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <div className="mb-1 flex items-center gap-2 font-semibold">
              <CalendarDaysIcon className="h-4 w-4" />
              Дни без занятий
            </div>
            <div>{risks.emptyDaysCount}</div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <div className="mb-1 font-semibold text-slate-900">Следующее занятие</div>
            <div>{formatSessionDateTime(risks.nextSessionAt)}</div>
          </div>
        </div>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-950">Конкретные занятия</div>
            <div className="mt-1 text-xs text-slate-500">
              Материализованные занятия текущего месяца. Клик открывает деталку занятия.
            </div>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
            {sessions.length} занятий
          </span>
        </div>

        {loading ? (
          <LoadingState label="Загрузка занятий..." />
        ) : upcomingSessions.length === 0 ? (
          <EmptyState
            title="Занятий на месяц нет"
            description="После материализации расписания конкретные тренировки появятся здесь."
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {upcomingSessions.map((session) => {
              const effectiveStatus = session.effectiveStatus ?? session.status;
              const mainCoach = session.coaches[0];

              return (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => navigate(`/admin/groups/${groupId}/sessions/${session.id}`)}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:-translate-y-0.5 hover:border-cyan-200 hover:bg-white hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-slate-950">
                          {formatSessionDate(session.startsAt)} · {formatSessionTime(session.startsAt)}-{formatSessionTime(session.endsAt)}
                        </span>
                        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${sessionStatusClasses[effectiveStatus]}`}>
                          {sessionStatusLabels[effectiveStatus]}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                        <span>{session.location?.name ?? "Локация не указана"}</span>
                        <span>{mainCoach?.fullName ?? "Тренер не указан"}</span>
                      </div>
                    </div>
                    <CalendarDaysIcon className="h-5 w-5 shrink-0 text-cyan-800" />
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                    <SessionMiniStat label="Всего" value={session.attendance.total} />
                    <SessionMiniStat label="Отмечено" value={session.attendance.marked} />
                    <SessionMiniStat label="Зачтено" value={session.attendance.presentLike} />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-950">Недельная сетка</div>
            <div className="mt-1 text-xs text-slate-500">
              Активные слоты по всем периодам расписания.
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-cyan-50 px-2.5 py-1 font-medium text-cyan-800">
              {activeSchedules.length} слотов
            </span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">
              {batches.length} периодов
            </span>
          </div>
        </div>

        {loading ? (
          <LoadingState label="Загрузка сетки..." />
        ) : activeSchedules.length === 0 ? (
          <EmptyState
            title="Сетка пустая"
            description="Добавьте период расписания, чтобы увидеть занятия по дням недели."
          />
        ) : (
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            {weeklyScheduleByDay.map((day) => (
              <div
                key={day.key}
                className={`min-h-[142px] rounded-2xl border px-2.5 py-2.5 ${
                  day.items.length > 0
                    ? "border-cyan-100 bg-cyan-50/45"
                    : "border-slate-200 bg-slate-50/70"
                }`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-sm font-semibold text-slate-900">{day.label}</div>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-slate-500 ring-1 ring-slate-200">
                    {day.items.length}
                  </span>
                </div>

                {day.items.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 px-2 py-5 text-center text-xs text-slate-400">
                    Свободно
                  </div>
                ) : (
                  <div className="space-y-2">
                    {day.items.map((item) => (
                      <div
                        key={item.scheduleId}
                        className="rounded-xl border border-white/80 bg-white px-2.5 py-2 shadow-sm"
                      >
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-950">
                          <ClockIcon className="h-3.5 w-3.5 text-cyan-800" />
                          {toTime(item.startTime)}-{toTime(item.endTime)}
                        </div>
                        <div className="mt-1 flex items-center gap-1.5 truncate text-[11px] text-slate-500">
                          <UserCircleIcon className="h-3.5 w-3.5" />
                          <span className="truncate">{coachMap[item.coachId] ?? "Тренер не указан"}</span>
                        </div>
                        <div className="mt-1 truncate text-[11px] text-slate-400">
                          до {item.endDate || "без даты окончания"}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* BATCH LIST */}
      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : loading ? (
        <LoadingState label="Загрузка периодов..." />
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
        <section className="space-y-3">
          <div>
            <div className="text-sm font-semibold text-slate-950">Периоды расписания</div>
            <div className="mt-1 text-xs text-slate-500">
              Здесь админ редактирует интервалы, тренера и набор дней.
            </div>
          </div>
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
        </section>
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
          onSave={validateAndSaveBatch}
        />
      )}
    </div>
  );
};

const SessionMiniStat: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div className="rounded-xl border border-slate-200 bg-white px-2.5 py-2">
    <div className="font-semibold text-slate-950">{value}</div>
    <div className="mt-0.5 text-slate-500">{label}</div>
  </div>
);

export default GroupScheduleTab;
