import React, { useEffect, useMemo, useState } from "react";
import {
  BriefcaseIcon,
  CheckCircleIcon,
  MagnifyingGlassIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import { useAuth } from "../../../../shared/AuthContext";
import { ApiError, getApiErrorMessage } from "../../../../shared/api";
import {
  Button,
  EmptyState,
  ErrorState,
  FormField,
  LoadingState,
  ModalShell,
  formControlClassName,
} from "../../../../shared/ui";
import { CoachApi, type Coach } from "../../сoaches/coach.api";
import { GroupApi } from "../group.api";

interface Props {
  groupId: string;
  branchId: string;
  assignedCoachIds: string[];
  preferredRole?: "MAIN" | "ASSISTANT";
  lockRole?: boolean;
  onClose: () => void;
  onAssigned: () => void;
}

const PAGE_SIZE = 50;

const todayIso = () => {
  const today = new Date();
  const offset = today.getTimezoneOffset() * 60_000;
  return new Date(today.getTime() - offset).toISOString().slice(0, 10);
};

const initials = (coach: Coach) =>
  `${coach.firstName?.[0] ?? ""}${coach.lastName?.[0] ?? ""}`.toUpperCase() || "ТР";

const AssignCoachModal: React.FC<Props> = ({
  groupId,
  branchId,
  assignedCoachIds,
  preferredRole = "ASSISTANT",
  lockRole = false,
  onClose,
  onAssigned,
}) => {
  const { user } = useAuth();
  const token = user?.accessToken;
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedCoachId, setSelectedCoachId] = useState<string | null>(null);
  const [role, setRole] = useState<"MAIN" | "ASSISTANT">(preferredRole);
  const [assignedFrom, setAssignedFrom] = useState(todayIso);
  const [assignedTo, setAssignedTo] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const selectedCoach = useMemo(
    () => coaches.find((coach) => coach.id === selectedCoachId) ?? null,
    [coaches, selectedCoachId]
  );
  const dateError = assignedTo && assignedTo < assignedFrom
    ? "Дата окончания не может быть раньше даты начала"
    : null;

  useEffect(() => {
    if (!token) return;
    let active = true;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const result = await CoachApi.listByBranch(branchId, token, 0, PAGE_SIZE, search.trim() || undefined);
        if (active) setCoaches(result.content);
      } catch (error) {
        if (active) setLoadError(getApiErrorMessage(error, "Не удалось загрузить тренеров"));
      } finally {
        if (active) setLoading(false);
      }
    }, search ? 250 : 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [branchId, search, token]);

  const submit = async () => {
    if (!token || !selectedCoach || dateError) return;
    setSaving(true);
    setFormError(null);
    try {
      await GroupApi.assignCoach(groupId, selectedCoach.id, role, token, {
        assignedFrom,
        assignedTo: assignedTo || null,
      });
      toast.success(`${selectedCoach.firstName} ${selectedCoach.lastName} назначен в группу`);
      await onAssigned();
      onClose();
    } catch (error) {
      if (error instanceof ApiError && error.code === "GROUP_MAIN_COACH_ALREADY_ASSIGNED") {
        setFormError("У группы уже есть главный тренер. Сначала измените роль текущего назначения.");
      } else {
        setFormError(getApiErrorMessage(error, "Не удалось назначить тренера"));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      title={lockRole && preferredRole === "MAIN" ? "Назначить главного тренера" : "Назначить тренера"}
      description="Выберите тренера филиала и укажите параметры его работы в группе."
      placement="right"
      maxWidthClassName="max-w-xl"
      bodyClassName="p-0"
      closeDisabled={saving}
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" disabled={saving} onClick={onClose}>Отмена</Button>
          <Button type="button" isLoading={saving} disabled={!selectedCoach || Boolean(dateError)} onClick={submit}>
            Назначить
          </Button>
        </div>
      }
    >
      <div className="border-b border-slate-200 bg-white px-5 py-4">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="text-sm font-semibold text-slate-950">Выберите тренера</div>
          {!loading ? <span className="text-xs text-slate-500">Найдено: {coaches.length}</span> : null}
        </div>
        <FormField label="Поиск по имени или почте" className="mb-0">
          <div className="relative">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Начните вводить имя"
              className={`${formControlClassName} pl-9`}
              autoFocus
            />
          </div>
        </FormField>
      </div>

      <div className="space-y-5 px-5 py-4">
        {loadError ? (
          <ErrorState message={loadError} />
        ) : loading ? (
          <LoadingState label="Поиск тренеров..." />
        ) : coaches.length === 0 ? (
          <EmptyState title="Тренеры не найдены" description="Попробуйте изменить поисковый запрос." />
        ) : (
          <div className="space-y-1.5">
            {coaches.map((coach) => {
              const assigned = assignedCoachIds.includes(coach.id);
              const selected = selectedCoachId === coach.id;
              return (
                <button
                  key={coach.id}
                  type="button"
                  disabled={assigned || !coach.active}
                  onClick={() => {
                    setSelectedCoachId(coach.id);
                    setFormError(null);
                  }}
                  className={`w-full rounded-lg border px-3 py-2.5 text-left transition ${
                    selected
                      ? "border-cyan-300 bg-cyan-50"
                      : "border-transparent bg-white hover:border-slate-200 hover:bg-slate-50"
                  } disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60`}
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-100 to-cyan-100 text-xs font-bold text-slate-700 ring-1 ring-slate-200">
                      {initials(coach)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-slate-950">{coach.firstName} {coach.lastName}</div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
                        <span>{coach.specialization || coach.email}</span>
                        {assigned ? <span className="font-medium text-slate-600">Уже в группе</span> : null}
                        {!coach.active ? <span className="font-medium text-rose-600">Аккаунт неактивен</span> : null}
                      </div>
                    </div>
                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${selected ? "border-cyan-700 bg-cyan-700 text-white" : "border-slate-300 bg-white"}`}>
                      {selected ? <CheckCircleIcon className="h-4 w-4" /> : null}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {selectedCoach ? (
          <div className="space-y-4 border-t border-slate-200 pt-5">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                <BriefcaseIcon className="h-4 w-4 text-cyan-700" />
                Параметры назначения
              </div>
              <p className="mt-1 text-xs text-slate-500">Настройки применятся только к выбранному тренеру.</p>
            </div>

            <div>
              <div className="mb-2 text-xs font-medium text-slate-500">Роль в группе</div>
              <div className="grid grid-cols-2 gap-2">
                {(["MAIN", "ASSISTANT"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    disabled={lockRole}
                    onClick={() => setRole(value)}
                    className={`rounded-lg border px-3 py-3 text-left transition ${role === value ? "border-cyan-300 bg-cyan-50" : "border-slate-200 bg-white hover:border-cyan-200"} disabled:cursor-not-allowed`}
                  >
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                      <UserIcon className="h-4 w-4 text-cyan-700" />
                      {value === "MAIN" ? "Главный" : "Ассистент"}
                    </div>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {value === "MAIN" ? "Основная ответственность за группу" : "Помогает проводить занятия"}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Дата начала" hint="С этой даты тренер закреплен за группой.">
                <input type="date" value={assignedFrom} onChange={(event) => setAssignedFrom(event.target.value)} className={formControlClassName} />
              </FormField>
              <FormField label="Дата окончания" hint="Можно оставить пустой." error={dateError ?? undefined}>
                <input type="date" min={assignedFrom} value={assignedTo} onChange={(event) => setAssignedTo(event.target.value)} className={`${formControlClassName} ${dateError ? "border-rose-300" : ""}`} />
              </FormField>
            </div>

            <div className="rounded-lg border border-cyan-100 bg-cyan-50 px-3 py-3 text-xs leading-5 text-cyan-900">
              Назначение закрепляет тренера за группой. Пересечения с другими занятиями будут проверены при создании или изменении периода расписания.
            </div>

            {formError ? (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-3 text-sm text-rose-700">{formError}</div>
            ) : null}
          </div>
        ) : null}
      </div>
    </ModalShell>
  );
};

export default AssignCoachModal;
