import React, { useMemo, useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { getApiErrorMessage } from "../../../../shared/api";
import {
  DayScheduleSlot,
  ScheduleValidationConflict,
  ScheduleValidationResult,
  UpdateScheduleBatchCommand,
  ScheduleType,
  DayOfWeek,
} from "./schedule.types";
import { DAYS } from "./schedule.utils";

interface CoachOption {
  id: string;
  name: string;
}

interface Props {
  coaches: CoachOption[];
  initialCoachId: string;
  initialType: ScheduleType;
  schedules: DayScheduleSlot[];
  startDate: string;
  endDate: string;
  onClose: () => void;
  onSave: (payload: UpdateScheduleBatchCommand) => Promise<ScheduleValidationResult>;
}

type EditableSlot = DayScheduleSlot & { enabled: boolean };

const EditScheduleModal: React.FC<Props> = ({
  coaches,
  initialCoachId,
  initialType,
  schedules,
  startDate,
  endDate,
  onClose,
  onSave,
}) => {
  const [coachId, setCoachId] = useState(initialCoachId);
  const [type, setType] = useState<ScheduleType>(initialType);
  const [from, setFrom] = useState(startDate);
  const [to, setTo] = useState(endDate);
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<ScheduleValidationConflict[]>([]);

  const [slots, setSlots] = useState<EditableSlot[]>(
    DAYS.map((d) => {
      const existing = schedules.find((s) => s.dayOfWeek === d.key);
      return {
        dayOfWeek: d.key as DayOfWeek,
        startTime: existing?.startTime ?? "09:00",
        endTime: existing?.endTime ?? "10:00",
        enabled: Boolean(existing),
      };
    })
  );

  const enabledSlots = slots.filter((s) => s.enabled);
  const hasCoachConflict =
    conflicts.some((conflict) => conflict.code === "COACH_SCHEDULE_CONFLICT") ||
    (apiError?.toLowerCase().includes("конфликт расписания") ?? false);

  const errors = useMemo(() => {
    const e: string[] = [];
    if (!coachId) e.push("Выберите тренера");
    if (!from || !to) e.push("Укажите даты периода");
    if (from && to && from > to) e.push("Дата окончания раньше даты начала");
    if (enabledSlots.length === 0) e.push("Выберите хотя бы один день");
    enabledSlots.forEach((s) => {
      if (s.startTime >= s.endTime) {
        e.push(`Некорректное время: ${s.dayOfWeek}`);
      }
    });
    return e;
  }, [coachId, from, to, enabledSlots]);

  const save = async () => {
    if (errors.length > 0) return;

    setSaving(true);
    setApiError(null);
    setConflicts([]);

    try {
      const result = await onSave({
        coachId,
        type,
        startDate: from,
        endDate: to,
        slots: enabledSlots.map((slot) => ({
          dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime,
        })),
      });
      if (!result.valid) {
        setConflicts(result.conflicts ?? []);
        setApiError("Обнаружены конфликты расписания. Исправьте их перед сохранением.");
        return;
      }
      onClose();
    } catch (e: unknown) {
      setApiError(getApiErrorMessage(e, "Не удалось сохранить расписание"));
    } finally {
      setSaving(false);
    }
  };

  const formatTimeRange = (start?: string | null, end?: string | null) => {
    if (!start && !end) return null;
    const shortStart = start?.slice(0, 5) ?? "";
    const shortEnd = end?.slice(0, 5) ?? "";
    return [shortStart, shortEnd].filter(Boolean).join(" - ");
  };

  const conflictTitle = (conflict: ScheduleValidationConflict) => {
    switch (conflict.code) {
      case "COACH_SCHEDULE_CONFLICT":
        return "Конфликт тренера";
      case "GROUP_SCHEDULE_CONFLICT":
        return "Конфликт группы";
      case "OVERLAPPING_INPUT_SLOTS":
        return "Пересечение внутри формы";
      case "INVALID_DATE_RANGE":
        return "Некорректный диапазон дат";
      case "INVALID_TIME_RANGE":
        return "Некорректный диапазон времени";
      case "EMPTY_SLOTS":
        return "Не выбраны слоты";
      default:
        return conflict.code;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
      <div className="bg-white w-full max-w-2xl rounded-2xl flex flex-col max-h-[90vh]">
        {/* HEADER */}
        <div className="flex justify-between items-center px-6 py-4 border-b">
          <h3 className="text-lg font-semibold">
            {schedules.length ? "Редактирование периода" : "Новый период"}
          </h3>
          <button onClick={onClose}>
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* META */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <select
              value={coachId}
              onChange={(e) => setCoachId(e.target.value)}
              className={`border rounded-xl px-3 py-2 col-span-2 ${
                hasCoachConflict ? "border-rose-300 bg-rose-50" : ""
              }`}
            >
              <option value="">Тренер</option>
              {coaches.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className={`border rounded-xl px-3 py-2 ${
                hasCoachConflict ? "border-rose-300 bg-rose-50" : ""
              }`}
            />
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className={`border rounded-xl px-3 py-2 ${
                hasCoachConflict ? "border-rose-300 bg-rose-50" : ""
              }`}
            />

            <select
              value={type}
              onChange={(e) => setType(e.target.value as ScheduleType)}
              className="border rounded-xl px-3 py-2 col-span-2"
            >
              <option value="REGULAR">Регулярное</option>
              <option value="TEMPORARY">Временное</option>
            </select>
          </div>

          {/* DAYS */}
          <div className="space-y-2">
            <div className="text-sm font-semibold">Дни и время</div>

            {slots.map((s, i) => {
              const day = DAYS.find((d) => d.key === s.dayOfWeek)!;

              return (
                <div
                  key={s.dayOfWeek}
                  className={`flex items-center gap-3 rounded-xl border px-3 py-2
                    ${s.enabled ? "bg-white" : "bg-gray-50"}
                  `}
                >
                  <input
                    type="checkbox"
                    checked={s.enabled}
                    onChange={() =>
                      setSlots((p) =>
                        p.map((x, idx) =>
                          idx === i ? { ...x, enabled: !x.enabled } : x
                        )
                      )
                    }
                  />
                  <span className="w-28 text-sm font-medium">{day.label}</span>
                  <input
                    type="time"
                    disabled={!s.enabled}
                    value={s.startTime}
                    onChange={(e) =>
                      setSlots((p) =>
                        p.map((x, idx) =>
                          idx === i
                            ? { ...x, startTime: e.target.value }
                            : x
                        )
                      )
                    }
                    className="border rounded-lg px-2 py-1"
                  />
                  <input
                    type="time"
                    disabled={!s.enabled}
                    value={s.endTime}
                    onChange={(e) =>
                      setSlots((p) =>
                        p.map((x, idx) =>
                          idx === i ? { ...x, endTime: e.target.value } : x
                        )
                      )
                    }
                    className="border rounded-lg px-2 py-1"
                  />
                </div>
              );
            })}
          </div>

          {/* ERRORS */}
          {errors.map((e) => (
            <div key={e} className="text-xs text-red-500">
              • {e}
            </div>
          ))}

          {apiError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              {apiError}
            </div>
          )}

          {conflicts.length > 0 ? (
            <div className="space-y-2">
              {conflicts.map((conflict, index) => (
                <div
                  key={`${conflict.code}-${conflict.conflictingScheduleId ?? index}`}
                  className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm text-rose-900"
                >
                  <div className="font-semibold">{conflictTitle(conflict)}</div>
                  {conflict.message ? (
                    <div className="mt-1 text-xs text-rose-800">{conflict.message}</div>
                  ) : null}
                  {conflict.dayOfWeek || conflict.startTime || conflict.endTime ? (
                    <div className="mt-1 text-xs text-rose-800">
                      Слот: {[conflict.dayOfWeek, formatTimeRange(conflict.startTime, conflict.endTime)]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  ) : null}
                  {conflict.overlapStart || conflict.overlapEnd ? (
                    <div className="mt-1 text-xs text-rose-800">
                      Пересечение: {formatTimeRange(conflict.overlapStart, conflict.overlapEnd)}
                    </div>
                  ) : null}
                  {conflict.conflictingGroupName || conflict.conflictingGroupId ? (
                    <div className="mt-1 text-xs text-rose-800">
                      Другая группа: {conflict.conflictingGroupName || conflict.conflictingGroupId}
                    </div>
                  ) : null}
                  {conflict.conflictingPeriodStart || conflict.conflictingPeriodEnd ? (
                    <div className="mt-1 text-xs text-rose-800">
                      Период конфликта: {[conflict.conflictingPeriodStart, conflict.conflictingPeriodEnd]
                        .filter(Boolean)
                        .join(" - ")}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}

          {hasCoachConflict ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900">
              У этого тренера уже есть занятие в выбранный период. Попробуйте:
              <div className="mt-2 text-xs text-amber-800">
                1. Выбрать другого тренера
              </div>
              <div className="text-xs text-amber-800">
                2. Изменить день недели или время занятия
              </div>
              <div className="text-xs text-amber-800">
                3. Сдвинуть даты периода, если конфликт только в части диапазона
              </div>
            </div>
          ) : null}
        </div>

        {/* FOOTER */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t">
          <button onClick={onClose} className="px-4 py-2 border rounded-xl">
            Отмена
          </button>
          <button
            disabled={saving}
            onClick={save}
            className="px-4 py-2 rounded-xl bg-admin-500 text-white"
          >
            {saving ? "Сохранение…" : "Сохранить"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditScheduleModal;
