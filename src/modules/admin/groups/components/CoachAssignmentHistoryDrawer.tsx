import React, { useEffect, useState } from "react";
import {
  ArrowRightIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ClockIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../../../../shared/AuthContext";
import { getApiErrorMessage, resolveApiUrl } from "../../../../shared/api";
import { EmptyState, ErrorState, LoadingState, ModalShell } from "../../../../shared/ui";
import type { MediaAsset } from "../../../../shared/media.types";
import { GroupApi, type GroupCoachHistoryItem } from "../group.api";
import CoachProfileLink from "./CoachProfileLink";

interface Props {
  groupId: string;
  onClose: () => void;
}

const roleLabel = (role: GroupCoachHistoryItem["role"]) =>
  role === "MAIN" ? "Главный тренер" : "Ассистент";

const formatDate = (value?: string | null) => {
  if (!value) return "не указано";
  const [year, month, day] = value.split("-").map(Number);
  const date = year && month && day ? new Date(year, month - 1, day) : new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", year: "numeric" }).format(date);
};

const initials = (firstName?: string, lastName?: string) =>
  `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase() || "ТР";

const HistoryAvatar: React.FC<{
  firstName?: string;
  lastName?: string;
  avatar?: MediaAsset | null;
}> = ({ firstName, lastName, avatar }) => {
  const url = avatar?.thumbUrl ?? avatar?.mediumUrl ?? avatar?.originalUrl;
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [url]);

  if (url && !failed) {
    return (
      <img
        src={resolveApiUrl(url)}
        alt=""
        className="h-10 w-10 rounded-full border border-slate-200 object-cover"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-50 text-xs font-bold text-cyan-800 ring-1 ring-cyan-100">
      {initials(firstName, lastName)}
    </span>
  );
};

const CoachAssignmentHistoryDrawer: React.FC<Props> = ({ groupId, onClose }) => {
  const { user } = useAuth();
  const token = user?.accessToken;
  const [items, setItems] = useState<GroupCoachHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      setItems(await GroupApi.getCoachHistory(groupId, token));
    } catch (loadError) {
      setError(getApiErrorMessage(loadError, "Не удалось загрузить историю назначений"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [groupId, token]);

  return (
    <ModalShell
      title="История назначений"
      description="Роли, периоды работы, снятия и замены тренеров этой группы."
      placement="right"
      maxWidthClassName="max-w-xl"
      onClose={onClose}
    >
      {loading ? (
        <LoadingState label="Загружаем историю..." />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : items.length === 0 ? (
        <EmptyState
          title="История пока пуста"
          description="Первое назначение тренера появится здесь автоматически."
        />
      ) : (
        <div className="divide-y divide-slate-100 border-y border-slate-200">
          {items.map((item) => {
            const coach = item.coach;
            return (
              <div key={item.groupCoachId} className="relative py-4 pl-7">
                <span className={`absolute left-0 top-5 flex h-5 w-5 items-center justify-center rounded-full ${item.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                  {item.active ? <CheckCircleIcon className="h-4 w-4" /> : <ClockIcon className="h-4 w-4" />}
                </span>

                <div className="flex items-start gap-3">
                  <HistoryAvatar firstName={coach?.firstName} lastName={coach?.lastName} avatar={coach?.avatar} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {coach ? (
                        <CoachProfileLink coachId={coach.id}>
                          {coach.firstName} {coach.lastName}
                        </CoachProfileLink>
                      ) : (
                        <span className="font-semibold text-slate-700">Тренер недоступен</span>
                      )}
                      <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${item.role === "MAIN" ? "border-cyan-100 bg-cyan-50 text-cyan-800" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
                        {roleLabel(item.role)}
                      </span>
                      {item.active ? <span className="text-xs font-medium text-emerald-700">Текущее</span> : null}
                    </div>

                    <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                      <CalendarDaysIcon className="h-4 w-4" />
                      <span>{formatDate(item.assignedFrom)}</span>
                      <ArrowRightIcon className="h-3.5 w-3.5" />
                      <span>{item.active ? "по настоящее время" : formatDate(item.assignedTo)}</span>
                    </div>

                    {!item.active && item.removalReason ? (
                      <p className="mt-2 text-sm text-slate-600">Причина: {item.removalReason}</p>
                    ) : null}

                    {!item.active && item.replacementCoach ? (
                      <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                        <UserIcon className="h-4 w-4" />
                        <span>Работа передана:</span>
                        <CoachProfileLink coachId={item.replacementCoach.id} className="text-xs">
                          {item.replacementCoach.firstName} {item.replacementCoach.lastName}
                        </CoachProfileLink>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </ModalShell>
  );
};

export default CoachAssignmentHistoryDrawer;
