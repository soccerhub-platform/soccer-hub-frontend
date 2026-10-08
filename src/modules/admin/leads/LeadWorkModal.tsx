import LeadModalShell from "./LeadModalShell";
import React, { useState } from "react";
import toast from "react-hot-toast";
import { Button, FormField, NativeSelect, formControlClassName } from "../../../shared/ui";
import { Input } from "../../../shared/ui/shadcn/Input";
import type { Lead, LeadWorkCommand } from "./types";
import { LeadApi } from "./lead.api";
import { contactLinks, PRIORITY_LABELS } from "./lead.workspace";

const localInput = (value?: string | null) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
export default function LeadWorkModal({ lead, mode = "PLAN", onClose, onSaved }: {
  lead: Lead; mode?: "PLAN" | "CONTACT"; onClose: () => void; onSaved: () => Promise<void> | void;
}) {
  const [priority, setPriority] = useState(lead.work?.priority ?? "NORMAL");
  const [action, setAction] = useState(lead.work?.nextAction ?? "");
  const [due, setDue] = useState(localInput(lead.work?.nextActionAt));
  const [channel, setChannel] = useState<LeadWorkCommand["channel"]>("PHONE");
  const [outcome, setOutcome] = useState<LeadWorkCommand["outcome"] | "">("");
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const links = contactLinks(lead);
  async function save() {
    if (busy) return;
    if (saved) { setBusy(true); try { await onSaved(); onClose(); } catch (reason) { setError(reason instanceof Error ? reason.message : "Не удалось обновить карточку"); } finally { setBusy(false); } return; }
    if (Boolean(action.trim()) !== Boolean(due)) { setError("Укажите действие и срок вместе."); return; }
    if (mode === "CONTACT" && !outcome) { setError("Выберите фактический результат контакта."); return; }
    setBusy(true); setError("");
    try {
      await LeadApi.updateWork(lead.id, { operation: mode, version: lead.work?.version ?? 0, priority,
        nextAction: action.trim() || null, nextActionAt: due ? (due === localInput(lead.work?.nextActionAt) ? lead.work?.nextActionAt : new Date(due).toISOString()) : null,
        ...(mode === "CONTACT" ? { channel, outcome: outcome || undefined } : {}), comment });
      setSaved(true); toast.success(mode === "CONTACT" ? "Контакт записан" : "План сохранён");
      await onSaved(); onClose();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Не удалось сохранить"); }
    finally { setBusy(false); }
  }
  return <LeadModalShell title={mode === "CONTACT" ? "Записать контакт" : "План работы с лидом"}
    description={lead.primaryContact.fullName} onClose={onClose} closeDisabled={busy}
    footer={<div className="flex justify-end gap-2"><Button variant="secondary" disabled={busy} onClick={onClose}>Отмена</Button><Button onClick={() => void save()} isLoading={busy}>{saved ? "Обновить карточку" : "Сохранить"}</Button></div>}>
    <form className="grid gap-4" onSubmit={e => { e.preventDefault(); void save(); }}>
      {mode === "CONTACT" && <><div className="flex flex-wrap gap-4 text-sm text-blue-700">
        <a href={links.phone}>Позвонить</a>{links.whatsapp && <a href={links.whatsapp} target="_blank" rel="noopener noreferrer">Открыть WhatsApp</a>}
        {links.email && <a href={links.email}>Написать email</a>}
      </div><p className="text-xs text-slate-600">Открытие приложения не отправляет сообщение и не подтверждает контакт. Успешный контакт переводит новый лид в работу; отсутствие ответа не меняет стадию.</p>
        <FormField label="Канал"><NativeSelect aria-label="Канал" value={channel} onChange={e => setChannel(e.target.value as LeadWorkCommand["channel"])} disabled={busy || saved}>
          <option value="PHONE">Телефон</option><option value="WHATSAPP">WhatsApp</option><option value="EMAIL">Email</option><option value="IN_PERSON">Лично</option>
        </NativeSelect></FormField>
        <FormField label="Результат контакта *"><NativeSelect aria-label="Результат контакта" value={outcome} onChange={e => setOutcome(e.target.value as typeof outcome)} required disabled={busy || saved}>
          <option value="">Выберите результат</option><option value="REACHED">Связались</option><option value="NO_ANSWER">Нет ответа</option><option value="FOLLOW_UP">Договорились о повторном контакте</option><option value="WRONG_NUMBER">Неверный номер</option>
        </NativeSelect></FormField></>}
      <FormField label="Приоритет"><NativeSelect aria-label="Приоритет" value={priority} onChange={e => setPriority(e.target.value as typeof priority)} disabled={busy || saved}>
        {Object.entries(PRIORITY_LABELS).map(([id,label]) => <option key={id} value={id}>{label}</option>)}
      </NativeSelect></FormField>
      <FormField label="Следующее действие" hint="Например: перезвонить родителю и согласовать пробное.">
        <Input aria-label="Следующее действие" maxLength={240} value={action} onChange={e => setAction(e.target.value)} disabled={busy || saved} />
      </FormField>
      <FormField label="Срок" hint={`Часовой пояс устройства: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`}>
        <Input aria-label="Срок" type="datetime-local" value={due} onChange={e => setDue(e.target.value)} disabled={busy || saved} />
      </FormField>
      <FormField label="Комментарий для истории"><textarea className={formControlClassName} maxLength={2000} value={comment} onChange={e => setComment(e.target.value)} disabled={busy || saved} /></FormField>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    </form>
  </LeadModalShell>;
}
