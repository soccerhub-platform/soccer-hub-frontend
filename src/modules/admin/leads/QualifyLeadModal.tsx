import React, { useMemo, useState } from "react";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { LeadChild, LeadDetails, QualifyLeadPayload } from "./types";
import { LeadApi } from "./lead.api";

interface QualifyLeadModalProps {
  leadId: string;
  token: string;
  initialLead: LeadDetails | null;
  onClose: () => void;
  onSuccess: () => Promise<void> | void;
}

const EMPTY_CHILD: LeadChild = { childName: "", childAge: 0 };

const QualifyLeadModal: React.FC<QualifyLeadModalProps> = ({
  leadId,
  token,
  initialLead,
  onClose,
  onSuccess,
}) => {
  const [children, setChildren] = useState<LeadChild[]>(
    initialLead?.children?.length ? initialLead.children : [EMPTY_CHILD]
  );
  const [preferredDays, setPreferredDays] = useState(initialLead?.preferredDays ?? "");
  const [experience, setExperience] = useState(initialLead?.experience ?? "BEGINNER");
  const [notes, setNotes] = useState(initialLead?.notes ?? initialLead?.comment ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid = useMemo(() => {
    const validChildren = children.length > 0 && children.every((child) => {
      return child.childName.trim() && Number.isFinite(child.childAge) && child.childAge > 0;
    });

    return validChildren && preferredDays.trim().length > 0 && experience.trim().length > 0;
  }, [children, preferredDays, experience]);

  const updateChild = (index: number, nextChild: LeadChild) => {
    setChildren((prev) => prev.map((child, childIndex) => {
      if (childIndex !== index) return child;
      return nextChild;
    }));
  };

  const handleSubmit = async () => {
    if (!isValid) return;

    const payload: QualifyLeadPayload = {
      children: children.map((child) => ({
        childName: child.childName.trim(),
        childAge: child.childAge,
      })),
      preferredDays: preferredDays.trim(),
      experience,
      notes: notes.trim(),
    };

    setLoading(true);
    setError(null);

    try {
      await LeadApi.qualify(leadId, payload, token);
      await onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Не удалось квалифицировать лид");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-4">
      <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h3 className="heading-font text-xl font-semibold text-slate-900">
              Квалифицировать лид
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Заполните данные для перевода в квалифицированный статус.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        <div className="max-h-[80vh] overflow-y-auto px-6 py-5">
          <div className="space-y-6">
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
                  Дети
                </h4>
                <button
                  type="button"
                  onClick={() => setChildren((prev) => [...prev, EMPTY_CHILD])}
                  className="inline-flex items-center gap-1 rounded-full bg-admin-50 px-3 py-1.5 text-xs font-medium text-admin-700"
                >
                  <PlusIcon className="h-3.5 w-3.5" />
                  Добавить
                </button>
              </div>

              <div className="space-y-3">
                {children.map((child, index) => (
                  <div
                    key={`child-${index}`}
                    className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[1fr_120px_44px]"
                  >
                    <label className="space-y-1 text-sm text-slate-600">
                      <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Имя ребенка
                      </span>
                      <input
                        type="text"
                        value={child.childName}
                        onChange={(event) =>
                          updateChild(index, {
                            ...child,
                            childName: event.target.value,
                          })
                        }
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none transition focus:border-admin-400"
                      />
                    </label>

                    <label className="space-y-1 text-sm text-slate-600">
                      <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Возраст
                      </span>
                      <input
                        type="number"
                        min={1}
                        value={child.childAge || ""}
                        onChange={(event) =>
                          updateChild(index, {
                            ...child,
                            childAge: Number(event.target.value),
                          })
                        }
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none transition focus:border-admin-400"
                      />
                    </label>

                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={() =>
                          setChildren((prev) => prev.filter((_, childIndex) => childIndex !== index))
                        }
                        disabled={children.length === 1}
                        className="inline-flex h-[46px] w-full items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-rose-200 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="space-y-1 text-sm text-slate-600">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Предпочтительные дни
                </span>
                <input
                  type="text"
                  value={preferredDays}
                  onChange={(event) => setPreferredDays(event.target.value)}
                  placeholder="Пн, Ср, Пт после 18:00"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none transition focus:border-admin-400"
                />
              </label>

              <label className="space-y-1 text-sm text-slate-600">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Опыт
                </span>
                <select
                  value={experience}
                  onChange={(event) => setExperience(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none transition focus:border-admin-400"
                >
                  <option value="BEGINNER">BEGINNER</option>
                  <option value="INTERMEDIATE">INTERMEDIATE</option>
                </select>
              </label>
            </section>

            <label className="space-y-1 text-sm text-slate-600">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Notes
              </span>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={5}
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 outline-none transition focus:border-admin-400"
              />
            </label>

            {error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isValid || loading}
            className="rounded-xl bg-admin-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-admin-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Сохранение..." : "Квалифицировать"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default QualifyLeadModal;
