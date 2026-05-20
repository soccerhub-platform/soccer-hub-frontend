import React, { useEffect, useMemo, useState } from "react";
import { buttonStyles } from "../../../shared/ui/buttonStyles";
import { Lead, LeadActionType, LeadLossReason } from "./types";

interface LeadLossModalProps {
  isOpen: boolean;
  lead: Pick<Lead, "parentName" | "phone"> | null;
  event: LeadActionType | "LOST" | "REJECT" | "NO_SHOW";
  reasons: LeadLossReason[];
  loadingReasons: boolean;
  reasonsError: string | null;
  submitting: boolean;
  onClose: () => void;
  onConfirm: (payload: { lostReasonCode: string; lostComment?: string }) => Promise<void> | void;
}

const LeadLossModal: React.FC<LeadLossModalProps> = ({
  isOpen,
  lead,
  event,
  reasons,
  loadingReasons,
  reasonsError,
  submitting,
  onClose,
  onConfirm,
}) => {
  const [lostReasonCode, setLostReasonCode] = useState("");
  const [lostComment, setLostComment] = useState("");
  const [submitAttempted, setSubmitAttempted] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLostReasonCode("");
    setLostComment("");
    setSubmitAttempted(false);
  }, [isOpen, event, lead?.parentName, lead?.phone]);

  const isOther = lostReasonCode === "OTHER";
  const fieldErrors = useMemo(() => {
    const reasonError = !lostReasonCode ? "Выберите причину" : "";
    const commentError =
      isOther && !lostComment.trim()
        ? "Для причины «Другое» комментарий обязателен"
        : "";
    return { reasonError, commentError };
  }, [isOther, lostComment, lostReasonCode]);

  const canSubmit =
    !loadingReasons &&
    !reasonsError &&
    !fieldErrors.reasonError &&
    !fieldErrors.commentError &&
    !submitting;

  if (!isOpen) return null;

  const isRejectFlow = event === "REJECT" || event === "POST_TRIAL_REJECT";
  const title = isRejectFlow ? "Причина отказа лида" : "Причина потери лида";
  const confirmLabel =
    isRejectFlow ? "Отклонить лид" : "Подтвердить потерю";

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="border-b border-slate-200 px-6 py-4">
          <h3 className="heading-font text-xl font-semibold text-slate-900">{title}</h3>
          <p className="mt-1 text-sm text-slate-500">
            Укажите, почему лид не дошел до оплаты.
          </p>
          {lead ? (
            <p className="mt-2 text-xs text-slate-500">
              {lead.parentName || "Лид"}{lead.phone ? ` • ${lead.phone}` : ""}
            </p>
          ) : null}
        </div>

        <div className="space-y-4 px-6 py-5">
          <label className="block space-y-1 text-sm text-slate-600">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Причина <span className="text-rose-500">*</span>
            </span>
            <select
              value={lostReasonCode}
              onChange={(event) => setLostReasonCode(event.target.value)}
              className={`w-full rounded-xl border bg-white px-3 py-2.5 outline-none transition focus:ring-4 ${
                fieldErrors.reasonError && submitAttempted
                  ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100"
                  : "border-slate-200 focus:border-cyan-700 focus:ring-cyan-100"
              }`}
              disabled={loadingReasons || submitting}
            >
              <option value="">Выберите причину</option>
              {reasons.map((reason) => (
                <option key={reason.code} value={reason.code}>
                  {reason.name || reason.code}
                </option>
              ))}
            </select>
            {submitAttempted && fieldErrors.reasonError ? (
              <p className="text-xs text-rose-600">{fieldErrors.reasonError}</p>
            ) : null}
            {reasonsError ? (
              <p className="text-xs text-rose-600">Не удалось загрузить причины потери</p>
            ) : null}
          </label>

          <label className="block space-y-1 text-sm text-slate-600">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Комментарий
              {isOther ? <span className="ml-1 text-rose-500">*</span> : null}
            </span>
            <textarea
              value={lostComment}
              onChange={(event) => setLostComment(event.target.value)}
              rows={4}
              placeholder={
                isOther ? "Опишите причину подробнее" : "Комментарий (необязательно)"
              }
              className={`w-full rounded-xl border bg-white px-3 py-2.5 outline-none transition focus:ring-4 ${
                fieldErrors.commentError && submitAttempted
                  ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100"
                  : "border-slate-200 focus:border-cyan-700 focus:ring-cyan-100"
              }`}
              disabled={submitting}
            />
            {submitAttempted && fieldErrors.commentError ? (
              <p className="text-xs text-rose-600">{fieldErrors.commentError}</p>
            ) : null}
          </label>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className={buttonStyles("secondary", "md", "rounded-xl")}
            disabled={submitting}
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={async () => {
              setSubmitAttempted(true);
              if (!canSubmit) return;
              await onConfirm({
                lostReasonCode,
                lostComment: lostComment.trim() || undefined,
              });
            }}
            disabled={!canSubmit}
            className={buttonStyles("danger", "md", "rounded-xl")}
          >
            {submitting ? "Сохранение..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LeadLossModal;
