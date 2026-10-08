import LeadModalShell from "./LeadModalShell";
import React, { useEffect, useMemo, useState } from "react";
import { Button, Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue, Textarea } from "../../../shared/ui";
import { Lead, LeadLossReason } from "./types";

interface LeadLossModalProps {
  isOpen: boolean;
  lead: Pick<Lead, "primaryContact"> | null;
  event: string;
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
  }, [isOpen, event, lead?.primaryContact?.fullName, lead?.primaryContact?.phone]);

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

  const title = "Закрыть лид";
  const confirmLabel =
    "Закрыть с отказом";

  return (
    <LeadModalShell
      title={title}
      description={`Укажите, почему лид не дошел до оплаты.${lead ? ` ${lead.primaryContact?.fullName || "Лид"}${lead.primaryContact?.phone ? ` · ${lead.primaryContact.phone}` : ""}` : ""}`}
      eyebrow="Причина потери"
      onClose={onClose}
      closeDisabled={submitting}
      maxWidthClassName="max-w-lg"
      footer={
        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Отмена
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={async () => {
              setSubmitAttempted(true);
              if (!canSubmit) return;
              await onConfirm({
                lostReasonCode,
                lostComment: lostComment.trim() || undefined,
              });
            }}
            disabled={loadingReasons || Boolean(reasonsError) || submitting}
            isLoading={submitting}
          >
            {confirmLabel}
          </Button>
        </div>
      }
    >
        <div className="flex flex-col gap-4">
          <label className="block flex flex-col gap-1 text-sm text-slate-600">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-600">
              Причина <span className="text-rose-500">*</span>
            </span>
            <Select value={lostReasonCode} onValueChange={setLostReasonCode} disabled={loadingReasons || submitting}>
              <SelectTrigger aria-label="Причина" aria-invalid={submitAttempted && Boolean(fieldErrors.reasonError)} className={fieldErrors.reasonError && submitAttempted ? "border-rose-300 focus:ring-rose-100" : ""}><SelectValue placeholder="Выберите причину" /></SelectTrigger>
              <SelectContent><SelectGroup>{reasons.map((reason) => <SelectItem key={reason.code} value={reason.code}>{reason.name || reason.code}</SelectItem>)}</SelectGroup></SelectContent>
            </Select>
            {submitAttempted && fieldErrors.reasonError ? (
              <p className="text-xs text-rose-600">{fieldErrors.reasonError}</p>
            ) : null}
            {reasonsError ? (
              <p className="text-xs text-rose-600">Не удалось загрузить причины потери</p>
            ) : null}
          </label>

          <label className="block flex flex-col gap-1 text-sm text-slate-600">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-600">
              Комментарий
              {isOther ? <span className="ml-1 text-rose-500">*</span> : null}
            </span>
            <Textarea
              aria-label="Комментарий"
              maxLength={1000}
              value={lostComment}
              onChange={(event) => setLostComment(event.target.value)}
              placeholder={
                isOther ? "Опишите причину подробнее" : "Комментарий (необязательно)"
              }
              className={fieldErrors.commentError && submitAttempted ? "border-rose-300 focus:ring-rose-100" : ""}
              disabled={submitting}
            />
            {submitAttempted && fieldErrors.commentError ? (
              <p className="text-xs text-rose-600">{fieldErrors.commentError}</p>
            ) : null}
          </label>
        </div>
    </LeadModalShell>
  );
};

export default LeadLossModal;
