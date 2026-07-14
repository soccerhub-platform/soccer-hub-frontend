import React, { useEffect, useState } from "react";
import {
  ArrowLeftIcon,
  ExclamationTriangleIcon,
  KeyIcon,
  PencilSquareIcon,
  PlusIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";

import { useAuth } from "../../../shared/AuthContext";
import { useAdminBranch } from "../BranchContext";
import { Button, EmptyState, ErrorState, FormField, LoadingState, ModalShell, PageShell, formControlClassName } from "../../../shared/ui";
import { CoachApi, CoachAvailability, CoachProfile, CoachStatus, TrainerActivityResponse, TrainerOverview } from "./coach.api";
import { GroupApi } from "../groups/group.api";
import {
  AssignCoachToGroupModal,
  CoachGroupAssignment,
  CoachProfileContent,
  EditCoachModal,
  ResetCoachPasswordModal,
  StatusBadge,
  normalizeAvailabilityDays,
} from "./CoachesPage";

const detailSections = [
  { id: "coach-details-load", label: "Обзор" },
  { id: "coach-details-groups", label: "Группы" },
  { id: "coach-details-schedule", label: "Расписание" },
  { id: "coach-details-sessions", label: "Занятия" },
  { id: "coach-details-reports", label: "Отчеты" },
  { id: "coach-details-history", label: "Активность" },
];

const availabilityDays = [
  { value: "MON", label: "Пн" },
  { value: "TUE", label: "Вт" },
  { value: "WED", label: "Ср" },
  { value: "THU", label: "Чт" },
  { value: "FRI", label: "Пт" },
  { value: "SAT", label: "Сб" },
  { value: "SUN", label: "Вс" },
];

const CoachDetailsPage: React.FC = () => {
  const { coachId } = useParams<{ coachId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const token = user?.accessToken;
  const { branchId } = useAdminBranch();

  const [profile, setProfile] = useState<CoachProfile | null>(null);
  const [trainerOverview, setTrainerOverview] = useState<TrainerOverview | null>(null);
  const [activityPage, setActivityPage] = useState(0);
  const [activitySize] = useState(20);
  const [activity, setActivity] = useState<TrainerActivityResponse | null>(null);
  const [activityLoading, setActivityLoading] = useState(false);
  const [assignments, setAssignments] = useState<CoachGroupAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [showAssignGroup, setShowAssignGroup] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showWorkStatus, setShowWorkStatus] = useState(false);
  const [showAvailability, setShowAvailability] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetPasswordValue, setResetPasswordValue] = useState<string | null>(null);

  const reloadActivityFirstPage = () => {
    setActivityPage(0);
    if (!coachId || !token) return;
    setActivityLoading(true);
    CoachApi.getTrainerActivity(coachId, token, { page: 0, size: activitySize })
      .then((data) => setActivity(data))
      .catch((error) => {
        console.error("Failed to load trainer activity", error);
        setActivity(null);
      })
      .finally(() => setActivityLoading(false));
  };

  const loadProfile = async () => {
    if (!coachId || !token) return;

    setLoading(true);
    setError(null);
    try {
      const [data, overview] = await Promise.all([
        CoachApi.profile(coachId, token),
        CoachApi.trainerOverview(coachId, token).catch((error) => {
          console.error("Failed to load trainer overview", error);
          return null;
        }),
      ]);
      setProfile(data);
      setTrainerOverview(overview);
      setAssignments(
        data.groups.map((group) => ({
          groupId: group.groupId,
          groupName: group.groupName,
          branchId: group.branchId,
          groupCoachId: group.groupCoachId ?? null,
          role: group.role ?? null,
          studentsCount: group.studentsCount,
          activeStudentsCount: group.activeStudentsCount,
          weeklySlotsCount: group.weeklySlotsCount,
          nextSession: group.nextSession ?? null,
          riskFlags: group.riskFlags ?? [],
        }))
      );
    } catch (e) {
      console.error("Failed to load coach profile", e);
      setError("Не удалось загрузить профиль тренера");
      setProfile(null);
      setTrainerOverview(null);
      setActivity(null);
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProfile();
  }, [coachId, token]);

  useEffect(() => {
    if (!coachId || !token) return;

    setActivityLoading(true);
    CoachApi.getTrainerActivity(coachId, token, { page: activityPage, size: activitySize })
      .then((data) => setActivity(data))
      .catch((error) => {
        console.error("Failed to load trainer activity", error);
        setActivity(null);
      })
      .finally(() => setActivityLoading(false));
  }, [coachId, token, activityPage, activitySize]);

  const toggleStatus = async () => {
    if (!profile || !token) return;
    const nextStatus: CoachStatus = profile.active ? "INACTIVE" : "ACTIVE";

    setUpdating(true);
    try {
      await CoachApi.updateStatus(profile.coachId, nextStatus, token);
      toast.success(profile.active ? "Тренер отключен" : "Тренер включен");
      await loadProfile();
      reloadActivityFirstPage();
    } catch (e) {
      console.error(e);
      toast.error("Не удалось изменить статус");
    } finally {
      setUpdating(false);
    }
  };

  const unassignFromGroup = async (assignment: CoachGroupAssignment) => {
    if (!token) return;
    if (!assignment.groupCoachId) {
      toast.error("Нельзя снять тренера: отсутствует идентификатор назначения");
      return;
    }
    if (!confirm(`Снять тренера с группы "${assignment.groupName}"?`)) return;

    setUpdating(true);
    try {
      await GroupApi.unassignCoach(assignment.groupCoachId, token);
      toast.success("Тренер снят с группы");
      await loadProfile();
    } catch (e) {
      console.error(e);
      toast.error("Не удалось снять тренера с группы");
    } finally {
      setUpdating(false);
    }
  };

  const resetPassword = async () => {
    if (!profile || !token) return;
    setResetLoading(true);
    try {
      const output = await CoachApi.resetPassword(profile.coachId, token);
      const password = output.tempPassword ?? output.temporaryPassword ?? null;
      if (!password) {
        toast.error("Сброс выполнен, но пароль не вернулся в ответе");
        setShowResetPassword(false);
        return;
      }
      setResetPasswordValue(password);
    } catch (e) {
      console.error(e);
      toast.error("Не удалось сбросить пароль тренера");
      setShowResetPassword(false);
    } finally {
      setResetLoading(false);
    }
  };

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (!token) {
    return <ErrorState message="Нет авторизации" />;
  }

  if (!branchId) {
    return (
      <PageShell>
        <EmptyState title="Сначала выберите филиал" description="Профиль тренера доступен после выбора филиала." />
      </PageShell>
    );
  }

  if (!coachId) {
    return (
      <PageShell>
        <ErrorState message="Не найден идентификатор тренера" />
      </PageShell>
    );
  }

  return (
    <PageShell className="max-w-none space-y-4">
      <button
        type="button"
        onClick={() => navigate("/admin/coaches")}
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-admin-700"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Назад к тренерам
      </button>

      {error ? (
        <ErrorState message={error} onRetry={loadProfile} />
      ) : loading ? (
        <LoadingState label="Загрузка профиля тренера..." />
      ) : profile ? (
        <>
          <section className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-700 to-teal-500 text-base font-semibold text-white shadow-sm">
                  {`${profile.firstName?.[0] ?? ""}${profile.lastName?.[0] ?? ""}`.toUpperCase() || <UserCircleIcon className="h-7 w-7" />}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-xl font-semibold tracking-tight text-slate-950">
                      {profile.firstName} {profile.lastName}
                    </h1>
                    <StatusBadge active={profile.active} workStatus={trainerOverview?.trainer.workStatus ?? profile.workStatus} />
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    {profile.specialization || "Специализация не указана"} · {profile.phone} · {profile.email}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-slate-50 px-2.5 py-1 font-medium text-slate-700 ring-1 ring-slate-200">
                      Группы: {profile.groups.length}
                    </span>
                    <span className="rounded-full bg-slate-50 px-2.5 py-1 font-medium text-slate-700 ring-1 ring-slate-200">
                      Ближайшие занятия: {profile.upcomingSessions.length}
                    </span>
                    {profile.reports.overdueCount > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 font-medium text-rose-700 ring-1 ring-rose-100">
                        <ExclamationTriangleIcon className="h-3.5 w-3.5" />
                        Просрочено отчетов: {profile.reports.overdueCount}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 lg:justify-end">
                  <Button type="button" variant="secondary" onClick={() => setShowEdit(true)}>
                    <PencilSquareIcon className="h-4 w-4" />
                    Редактировать
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => setShowAssignGroup(true)}>
                    <PlusIcon className="h-4 w-4" />
                    Назначить в группу
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => setShowWorkStatus(true)}>Изменить рабочий статус</Button>
                  <Button type="button" variant="secondary" onClick={() => setShowResetPassword(true)}>
                    <KeyIcon className="h-4 w-4" />
                    Сбросить пароль
                  </Button>
                  <Button
                    type="button"
                    variant={profile.active ? "softDanger" : "soft"}
                    isLoading={updating}
                    onClick={toggleStatus}
                  >
                    {profile.active ? "Отключить" : "Включить"}
                  </Button>
              </div>
            </div>
          </section>

          <nav className="sticky top-3 z-10 flex gap-1.5 overflow-x-auto rounded-xl border border-slate-200 bg-white/90 p-1.5 shadow-sm backdrop-blur">
            {detailSections.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => scrollToSection(section.id)}
                className="shrink-0 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-cyan-50 hover:text-cyan-800"
              >
                {section.label}
              </button>
            ))}
          </nav>

          <CoachProfileContent
            profile={profile}
            assignments={assignments}
            trainerOverview={trainerOverview}
            activity={activity}
            activityLoading={activityLoading}
            onActivityPageChange={setActivityPage}
            onOpenGroup={(groupId) => navigate(`/admin/groups/${groupId}/overview`)}
            onUnassignGroup={unassignFromGroup}
            onAssignGroup={() => setShowAssignGroup(true)}
            onEditAvailability={() => setShowAvailability(true)}
            showIdentity={false}
            sectionPrefix="coach-details"
          />

          {showAssignGroup ? (
            <AssignCoachToGroupModal
              coachId={profile.coachId}
              branchId={branchId}
              assignedGroupIds={assignments.map((item) => item.groupId)}
              token={token}
              onClose={() => setShowAssignGroup(false)}
              onAssigned={async () => {
                setShowAssignGroup(false);
                await loadProfile();
                reloadActivityFirstPage();
              }}
            />
          ) : null}
          {showEdit ? (
            <EditCoachModal
              profile={profile}
              token={token}
              onClose={() => setShowEdit(false)}
              onSaved={async () => {
                setShowEdit(false);
                await loadProfile();
                reloadActivityFirstPage();
              }}
            />
          ) : null}
          {showResetPassword ? (
            <ResetCoachPasswordModal
              coachName={`${profile.firstName} ${profile.lastName}`}
              password={resetPasswordValue}
              loading={resetLoading}
              onReset={resetPassword}
              onClose={() => {
                setShowResetPassword(false);
                setResetPasswordValue(null);
              }}
            />
          ) : null}
          {showWorkStatus ? (
            <WorkStatusModal
              profile={profile}
              token={token}
              onClose={() => setShowWorkStatus(false)}
              onSaved={async () => {
                setShowWorkStatus(false);
                await loadProfile();
                reloadActivityFirstPage();
              }}
            />
          ) : null}
          {showAvailability ? (
            <AvailabilityModal
              coachId={profile.coachId}
              initialValue={trainerOverview?.availability ?? null}
              token={token}
              onClose={() => setShowAvailability(false)}
              onSaved={async () => {
                setShowAvailability(false);
                await loadProfile();
                reloadActivityFirstPage();
              }}
            />
          ) : null}
        </>
      ) : (
        <EmptyState title="Тренер не найден" description="Профиль тренера не вернулся из backend." />
      )}
    </PageShell>
  );
};

const WorkStatusModal: React.FC<{ profile: CoachProfile; token: string; onClose: () => void; onSaved: () => Promise<void> }> = ({ profile, token, onClose, onSaved }) => {
  const [status, setStatus] = useState(profile.workStatus ?? "AVAILABLE");
  const [from, setFrom] = useState(profile.vacationFrom ?? new Date().toISOString().slice(0, 10));
  const [to, setTo] = useState(profile.vacationTo ?? "");
  const [reason, setReason] = useState(profile.workStatusReason ?? "");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      await CoachApi.updateWorkStatus(
        profile.coachId,
        status,
        status === "VACATION" ? from : null,
        status === "VACATION" ? to || null : null,
        reason.trim() || null,
        token
      );
      toast.success("Рабочий статус обновлен");
      await onSaved();
    } catch (error) {
      console.error(error);
      toast.error("Не удалось изменить рабочий статус");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      title="Рабочий статус"
      description="Не влияет на статус учетной записи"
      onClose={onClose}
      closeDisabled={saving}
      maxWidthClassName="max-w-md"
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Отмена
          </Button>
          <Button type="button" onClick={submit} isLoading={saving} disabled={status === "VACATION" && (!from || !to)}>
            Сохранить
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          {([["AVAILABLE", "Доступен"], ["BUSY", "Занят"], ["VACATION", "В отпуске"]] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setStatus(value)}
              className={`rounded-lg border px-2 py-2 text-sm font-medium ${
                status === value ? "border-cyan-600 bg-cyan-50 text-cyan-800" : "border-slate-200 text-slate-600"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {status === "VACATION" ? (
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm text-slate-600">
              Дата начала
              <input
                type="date"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
              />
            </label>
            <label className="text-sm text-slate-600">
              Дата окончания
              <input
                type="date"
                min={from}
                value={to}
                onChange={(event) => setTo(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
              />
            </label>
          </div>
        ) : null}
        <label className="block text-sm text-slate-600">
          Комментарий
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={3}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
          />
        </label>
      </div>
    </ModalShell>
  );
};

const AvailabilityModal: React.FC<{
  coachId: string;
  initialValue: CoachAvailability | null;
  token: string;
  onClose: () => void;
  onSaved: () => Promise<void>;
}> = ({ coachId, initialValue, token, onClose, onSaved }) => {
  const [form, setForm] = useState<CoachAvailability>({
    days: initialValue?.days?.length ? normalizeAvailabilityDays(initialValue.days) : ["MON", "TUE", "WED", "THU", "FRI"],
    timeFrom: initialValue?.timeFrom ?? "09:00",
    timeTo: initialValue?.timeTo ?? "18:00",
    timezone: initialValue?.timezone ?? "Asia/Almaty",
  });
  const [saving, setSaving] = useState(false);

  const toggleDay = (day: string) => {
    setForm((current) => ({
      ...current,
      days: current.days.includes(day)
        ? current.days.filter((item) => item !== day)
        : [...current.days, day],
    }));
  };

  const submit = async () => {
    if (form.days.length === 0) {
      toast.error("Выберите хотя бы один рабочий день");
      return;
    }
    if (!form.timeFrom || !form.timeTo || form.timeFrom >= form.timeTo) {
      toast.error("Проверьте рабочее время");
      return;
    }

    setSaving(true);
    try {
      await CoachApi.updateAvailability(coachId, { ...form, days: normalizeAvailabilityDays(form.days) }, token);
      toast.success("Рабочая доступность обновлена");
      await onSaved();
    } catch (error) {
      console.error(error);
      toast.error("Не удалось обновить доступность");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      title="Изменить доступность"
      description="Доступность показывает рабочие часы тренера и не удаляет существующие занятия."
      onClose={onClose}
      closeDisabled={saving}
      maxWidthClassName="max-w-lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" disabled={saving} onClick={onClose}>
            Отмена
          </Button>
          <Button type="button" isLoading={saving} onClick={submit}>
            Сохранить
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <FormField label="Дни недели">
          <div className="grid grid-cols-7 gap-1.5">
            {availabilityDays.map((day) => (
              <button
                key={day.value}
                type="button"
                onClick={() => toggleDay(day.value)}
                className={`rounded-lg border px-2 py-2 text-sm font-semibold ${
                  form.days.includes(day.value)
                    ? "border-cyan-600 bg-cyan-50 text-cyan-800"
                    : "border-slate-200 bg-white text-slate-600"
                }`}
              >
                {day.label}
              </button>
            ))}
          </div>
        </FormField>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Время с">
            <input
              type="time"
              className={formControlClassName}
              value={form.timeFrom}
              onChange={(event) => setForm((current) => ({ ...current, timeFrom: event.target.value }))}
            />
          </FormField>
          <FormField label="Время до">
            <input
              type="time"
              className={formControlClassName}
              value={form.timeTo}
              onChange={(event) => setForm((current) => ({ ...current, timeTo: event.target.value }))}
            />
          </FormField>
        </div>
        <FormField label="Часовой пояс">
          <input
            type="text"
            className={formControlClassName}
            value={form.timezone}
            onChange={(event) => setForm((current) => ({ ...current, timezone: event.target.value }))}
          />
        </FormField>
        <div className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
          Изменение доступности не отменяет уже созданные занятия. Конфликты в расписании остаются видимыми как предупреждения.
        </div>
      </div>
    </ModalShell>
  );
};

export default CoachDetailsPage;
