import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeftIcon,
  ExclamationTriangleIcon,
  PauseIcon,
  PlayIcon,
  StopIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../../../shared/AuthContext";
import {
  GroupApi,
  GroupApiModel,
  GroupSummaryModel,
} from "./group.api";
import GroupTabs from "./components/GroupTabs";
import GroupSummary from "./components/GroupSummary";
import toast from "react-hot-toast";
import {
  Button,
  ErrorState,
  LoadingState,
  PageHeader,
  PageShell,
  SectionCard,
} from "../../../shared/ui";

/* ================= STATUS BADGE ================= */

const StatusBadge = ({ status }: { status: GroupApiModel["status"] }) => {
  const map: Record<string, string> = {
    ACTIVE: "border-emerald-100 bg-emerald-50 text-emerald-700",
    PAUSED: "border-amber-100 bg-amber-50 text-amber-700",
    STOPPED: "border-rose-100 bg-rose-50 text-rose-700",
  };

  const label =
    status === "ACTIVE"
      ? "Активна"
      : status === "PAUSED"
      ? "На паузе"
      : "Остановлена";

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${map[status]}`}
    >
      {label}
    </span>
  );
};

/* ================= PAGE ================= */

const GroupDetailsPage: React.FC = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const token = user?.accessToken;

  const [group, setGroup] = useState<GroupApiModel | null>(null);
  const [summary, setSummary] = useState<GroupSummaryModel | null>(null);

  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ================= LOAD ================= */

  const loadGroup = async () => {
    if (!token) return;
    if (!groupId) return;

    setLoading(true);
    setError(null);
    try {
      const [groupData, summaryData] = await Promise.all([
        GroupApi.getById(groupId, token),
        GroupApi.getSummary(groupId, token),
      ]);
      setGroup(groupData);
      setSummary(summaryData);
    } catch (e) {
      console.error("Failed to load group details", e);
      setError("Не удалось загрузить данные группы");
      setGroup(null);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadGroup();
  }, [groupId, token]);

  /* ================= STATUS ================= */

  const changeStatus = async (
    status: "ACTIVE" | "PAUSED" | "STOPPED"
  ) => {
    if (!group || !token) return;

    if (status === "STOPPED") {
      const ok = confirm(
        "Вы уверены, что хотите остановить группу? Расписание будет отменено."
      );
      if (!ok) return;
    }

    setUpdating(true);
    try {
      await GroupApi.updateStatus(group.groupId, status, token);
      setGroup({ ...group, status });
      toast.success("Статус группы обновлен");
    } catch (e) {
      console.error(e);
      toast.error("Не удалось изменить статус группы");
    } finally {
      setUpdating(false);
    }
  };

  /* ================= UI ================= */

  if (!token) {
    return <ErrorState message="Нет авторизации" />;
  }

  if (loading) {
    return (
      <PageShell>
        <LoadingState label="Загрузка группы..." />
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell>
        <ErrorState message={error} onRetry={loadGroup} />
      </PageShell>
    );
  }

  if (!group) {
    return (
      <PageShell>
        <ErrorState message="Группа не найдена" />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title={group.name}
        description={`Возраст ${group.ageFrom}-${group.ageTo} лет · уровень ${group.level}`}
        actions={
          <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
            <ArrowLeftIcon className="h-4 w-4" />
            К группам
          </Button>
        }
      />

      <SectionCard>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan-50">
              <UserGroupIcon className="h-6 w-6 text-cyan-800" />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="heading-font text-xl font-semibold text-slate-900">{group.name}</h2>
                <StatusBadge status={group.status} />
              </div>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                {group.description || "Описание группы пока не добавлено."}
              </p>
              {group.status === "STOPPED" ? (
                <div className="mt-3 flex items-start gap-2 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />
                  Группа остановлена. Расписание и новые занятия для нее недоступны.
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 lg:justify-end">
            {group.status === "PAUSED" ? (
              <Button
                type="button"
                variant="soft"
                isLoading={updating}
                onClick={() => changeStatus("ACTIVE")}
              >
                <PlayIcon className="h-4 w-4" />
                Активировать
              </Button>
            ) : null}

            {group.status === "ACTIVE" ? (
              <Button
                type="button"
                variant="secondary"
                isLoading={updating}
                onClick={() => changeStatus("PAUSED")}
              >
                <PauseIcon className="h-4 w-4" />
                Поставить на паузу
              </Button>
            ) : null}

            {group.status !== "STOPPED" ? (
              <Button
                type="button"
                variant="softDanger"
                isLoading={updating}
                onClick={() => changeStatus("STOPPED")}
              >
                <StopIcon className="h-4 w-4" />
                Остановить
              </Button>
            ) : null}
          </div>
        </div>
      </SectionCard>

      {/* SUMMARY */}
      {summary && (
        <GroupSummary
          coachesCount={summary.coachesCount}
          sessionsPerWeek={summary.sessionPerWeek}
          nextSession={summary.nextSession}
          studentsCount={summary.studentsCount}
          capacity={summary.capacity}
          scheduleActive={summary.scheduleActive}
        />
      )}

      {/* TABS */}
      <GroupTabs groupId={group.groupId} />
    </PageShell>
  );
};

export default GroupDetailsPage;
