import React, { useEffect, useState } from "react";
import {
  RefreshCw,
  CalendarDays,
  TriangleAlert,
  User,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../../../../shared/AuthContext";
import { getApiErrorMessage } from "../../../../shared/api";
import {
  NativeSelect,
  Button,
  ErrorState,
  FormField,
  LoadingState,
  ModalShell,
  formControlClassName,
  } from "../../../../shared/ui";
import { GroupApi, type GroupCoachApiModel, type GroupCoachRemovalPreview } from "../group.api";

interface Props {
  coach: GroupCoachApiModel;
  onClose: () => void;
  onRemoved: () => void | Promise<void>;
}

const todayIso = () => {
  const today = new Date();
  const offset = today.getTimezoneOffset() * 60_000;
  return new Date(today.getTime() - offset).toISOString().slice(0, 10);
};

const formatDateTime = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).format(date);
};

const RemoveCoachDrawer: React.FC<Props> = ({ coach, onClose, onRemoved }) => {
  const { user } = useAuth();
  const token = user?.accessToken;
  const [preview, setPreview] = useState<GroupCoachRemovalPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [replacementCoachId, setReplacementCoachId] = useState<string | null>(null);
  const effectiveDate = todayIso();
  const [reason, setReason] = useState("Смена тренера");

  const loadPreview = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const result = await GroupApi.previewCoachRemoval(coach.groupCoachId, token);
      setPreview(result);
      if (result.replacementCandidates.length === 1) {
        setReplacementCoachId(result.replacementCandidates[0].coachId);
      }
    } catch (loadError) {
      setError(getApiErrorMessage(loadError, "Не удалось рассчитать последствия снятия"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPreview();
  }, [coach.groupCoachId, token]);

  const submit = async () => {
    if (!token || !preview) return;
    if (preview.replacementRequired && !replacementCoachId) {
      setError("Выберите тренера, которому будут переданы расписание и будущие занятия.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await GroupApi.removeCoach(coach.groupCoachId, {
        replacementCoachId,
        effectiveDate,
        reason,
      }, token);
      toast.success(`${preview.coachName} снят с группы`);
      await onRemoved();
      onClose();
    } catch (submitError) {
      setError(getApiErrorMessage(submitError, "Не удалось снять тренера"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      title="Снять тренера с группы"
      description={`${coach.coachFirstName} ${coach.coachLastName} останется в истории назначений.`}
      placement="right"
      maxWidthClassName="max-w-lg"
      closeDisabled={saving}
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" disabled={saving} onClick={onClose}>Отмена</Button>
          <Button
            type="button"
            variant="danger"
            isLoading={saving}
            disabled={!preview?.canRemove || (preview?.replacementRequired && !replacementCoachId)}
            onClick={submit}
          >
            Снять тренера
          </Button>
        </div>
      }
    >
      {loading ? (
        <LoadingState label="Проверяем расписание и занятия..." />
      ) : error && !preview ? (
        <ErrorState message={error} onRetry={loadPreview} />
      ) : preview ? (
        <div className="space-y-5">
          <div className={`rounded-lg border px-4 py-3 ${preview.replacementRequired ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`}>
            <div className="flex items-start gap-3">
              {preview.replacementRequired
                ? <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                : <RefreshCw className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />}
              <div>
                <div className="ui-section-title">
                  {preview.replacementRequired ? "Нужно передать работу другому тренеру" : "Тренера можно снять без замены"}
                </div>
                <p className="mt-1 text-xs leading-5 text-slate-600">
                  {preview.role === "MAIN" ? "Это главный тренер группы. Выбранная замена автоматически станет главным тренером. " : ""}
                  Будущие данные не будут удалены.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-slate-200 p-3">
              <div className="ui-metric-value">{preview.activeScheduleSlots}</div>
              <div className="mt-1 text-xs text-slate-500">активных слотов расписания</div>
            </div>
            <div className="rounded-lg border border-slate-200 p-3">
              <div className="ui-metric-value">{preview.futureSessionsCount}</div>
              <div className="mt-1 text-xs text-slate-500">будущих занятий</div>
            </div>
          </div>

          {preview.nextSessionAt ? (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <CalendarDays className="h-4 w-4 text-slate-400" />
              Ближайшее занятие: <span className="font-medium text-slate-900">{formatDateTime(preview.nextSessionAt)}</span>
            </div>
          ) : null}

          {preview.replacementRequired ? (
            <div>
              <div className="mb-2 ui-section-title">Передать тренеру</div>
              {preview.replacementCandidates.length > 0 ? (
                <div className="space-y-2">
                  {preview.replacementCandidates.map((candidate) => {
                    const selected = replacementCoachId === candidate.coachId;
                    return (
                      <button
                        key={candidate.coachId}
                        type="button"
                        onClick={() => {
                          setReplacementCoachId(candidate.coachId);
                          setError(null);
                        }}
                        className={`flex w-full items-center gap-3 rounded-lg border px-3 py-3 text-left transition ${selected ? "border-blue-300 bg-blue-50" : "border-slate-200 hover:border-blue-200"}`}
                      >
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600"><User className="h-4 w-4" /></span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate ui-section-title">{candidate.coachName}</span>
                          <span className="mt-0.5 block text-xs text-slate-500">{candidate.role === "MAIN" ? "Главный тренер" : "Ассистент"}</span>
                        </span>
                        <span className={`h-5 w-5 rounded-full border ${selected ? "border-admin-600 bg-admin-600 ring-4 ring-blue-100" : "border-slate-300"}`} />
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-3 text-sm text-rose-700">
                  В группе нет другого активного тренера. Сначала назначьте замену, затем повторите снятие.
                </div>
              )}
            </div>
          ) : null}

          <div className="rounded-lg border border-slate-200 px-3 py-3">
            <div className="text-xs font-medium text-slate-500">Дата снятия</div>
            <div className="mt-1 ui-section-title">Сегодня</div>
            <p className="mt-1 text-xs text-slate-400">Расписание и будущие занятия будут переданы сразу после подтверждения.</p>
          </div>

          <FormField label="Причина">
            <NativeSelect value={reason} onChange={(event) => setReason(event.target.value)} className={formControlClassName}>
              <option value="Смена тренера">Смена тренера</option>
              <option value="Изменение нагрузки">Изменение нагрузки</option>
              <option value="Отпуск или недоступность">Отпуск или недоступность</option>
              <option value="Завершение работы с группой">Завершение работы с группой</option>
            </NativeSelect>
          </FormField>

          {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-3 text-sm text-rose-700">{error}</div> : null}
        </div>
      ) : null}
    </ModalShell>
  );
};

export default RemoveCoachDrawer;
