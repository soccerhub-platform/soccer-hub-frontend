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
import { Button, EmptyState, ErrorState, LoadingState, PageShell } from "../../../shared/ui";
import { CoachApi, CoachProfile, CoachStatus } from "./coach.api";
import { GroupApi } from "../groups/group.api";
import {
  AssignCoachToGroupModal,
  CoachGroupAssignment,
  CoachProfileContent,
  EditCoachModal,
  ResetCoachPasswordModal,
  StatusBadge,
} from "./CoachesPage";

const detailSections = [
  { id: "coach-details-load", label: "Обзор" },
  { id: "coach-details-groups", label: "Группы" },
  { id: "coach-details-schedule", label: "Расписание" },
  { id: "coach-details-sessions", label: "Занятия" },
  { id: "coach-details-reports", label: "Отчеты" },
  { id: "coach-details-history", label: "История" },
];

const CoachDetailsPage: React.FC = () => {
  const { coachId } = useParams<{ coachId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const token = user?.accessToken;
  const { branchId } = useAdminBranch();

  const [profile, setProfile] = useState<CoachProfile | null>(null);
  const [assignments, setAssignments] = useState<CoachGroupAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [showAssignGroup, setShowAssignGroup] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetPasswordValue, setResetPasswordValue] = useState<string | null>(null);

  const loadProfile = async () => {
    if (!coachId || !token) return;

    setLoading(true);
    setError(null);
    try {
      const data = await CoachApi.profile(coachId, token);
      setProfile(data);
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
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProfile();
  }, [coachId, token]);

  const toggleStatus = async () => {
    if (!profile || !token) return;
    const nextStatus: CoachStatus = profile.active ? "INACTIVE" : "ACTIVE";

    setUpdating(true);
    try {
      await CoachApi.updateStatus(profile.coachId, nextStatus, token);
      toast.success(profile.active ? "Тренер отключен" : "Тренер включен");
      await loadProfile();
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
    <PageShell className="space-y-5">
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
          <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_44px_-34px_rgba(15,23,42,0.45)]">
            <div className="bg-[radial-gradient(circle_at_top_left,rgba(204,251,241,0.8),rgba(255,255,255,0.96)_42%,rgba(248,250,252,0.96))] px-5 py-5">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex min-w-0 gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white text-admin-700 shadow-sm ring-1 ring-admin-100">
                    <UserCircleIcon className="h-10 w-10" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
                        {profile.firstName} {profile.lastName}
                      </h1>
                      <StatusBadge active={profile.active} />
                    </div>
                    <div className="mt-1 text-sm text-slate-500">
                      {profile.specialization || "Специализация не указана"} · {profile.phone} · {profile.email}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full bg-white px-3 py-1 font-medium text-slate-700 ring-1 ring-slate-200">
                        Группы: {profile.groups.length}
                      </span>
                      <span className="rounded-full bg-white px-3 py-1 font-medium text-slate-700 ring-1 ring-slate-200">
                        Ближайшие занятия: {profile.upcomingSessions.length}
                      </span>
                      {profile.reports.overdueCount > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-3 py-1 font-medium text-rose-700 ring-1 ring-rose-100">
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
            </div>
          </section>

          <nav className="sticky top-3 z-10 flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white/90 p-2 shadow-sm backdrop-blur">
            {detailSections.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => scrollToSection(section.id)}
                className="shrink-0 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-cyan-50 hover:text-cyan-800"
              >
                {section.label}
              </button>
            ))}
          </nav>

          <CoachProfileContent
            profile={profile}
            assignments={assignments}
            onOpenGroup={(groupId) => navigate(`/admin/groups/${groupId}`)}
            onUnassignGroup={unassignFromGroup}
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
        </>
      ) : (
        <EmptyState title="Тренер не найден" description="Профиль тренера не вернулся из backend." />
      )}
    </PageShell>
  );
};

export default CoachDetailsPage;
