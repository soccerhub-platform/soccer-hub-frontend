import React from "react";
import { ArrowUpRight, Phone, CalendarDays, Clock3, Mail } from "lucide-react";
import { Button, ModalShell } from "../../../shared/ui";
import { Lead, LeadAction } from "./types";
import LeadStatusPill from "./LeadStatusPill";
import LeadActions from "./LeadActions";
import { buildLeadUiActions } from "./lead.ui-actions";
import { initials, dueLabel } from "./LeadList";
import { isActiveLead, nextStep, overdue, sourceLabel } from "./lead.workspace";
export default function LeadPreview({lead, onClose, onOpen, onPlan, onContact, onTrial, onAction}: {
  lead: Lead; onClose: () => void; onOpen: () => void; onPlan: () => void; onContact: () => void;
  onTrial: (id: string) => void; onAction: (action: LeadAction) => void;
}) {
  return <ModalShell title="Быстрый просмотр" description="Ключевые данные и следующий шаг" placement="right" maxWidthClassName="max-w-[460px]" onClose={onClose}
    footer={<Button className="w-full" onClick={onOpen}>Полная карточка<ArrowUpRight className="h-4 w-4"/></Button>}>
    <div className="grid gap-6">
      <div><div aria-hidden className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 font-semibold text-slate-600">{initials(lead.primaryContact.fullName)}</div>
        <h3 className="text-xl font-semibold tracking-tight text-slate-900">{lead.primaryContact.fullName}</h3><div className="mt-3"><LeadStatusPill status={lead.status}/></div>
        <div className="mt-4 grid gap-2 text-sm text-slate-600"><p className="flex items-center gap-2"><Phone className="h-4 w-4"/>{lead.primaryContact.phone}</p>{lead.primaryContact.email && <p className="flex items-center gap-2 break-all"><Mail className="h-4 w-4"/>{lead.primaryContact.email}</p>}</div>
        {isActiveLead(lead) && <Button className="mt-4" variant="secondary" size="sm" onClick={onContact}>Записать контакт</Button>}
      </div>
      <section className="rounded-xl border border-slate-200 bg-slate-50 p-4"><h4 className="flex items-center gap-2 text-xs font-semibold text-slate-600"><Clock3 className="h-4 w-4"/>Следующее действие</h4>
        <p className="mt-2 text-sm font-medium text-slate-900">{nextStep(lead)}</p>
        {isActiveLead(lead) && lead.work?.nextActionAt && <p className={`mt-1 text-xs ${overdue(lead) ? "text-rose-700" : "text-slate-600"}`}>{overdue(lead) ? "Просрочено · " : ""}{dueLabel(lead)}</p>}
        {isActiveLead(lead) && <Button className="mt-3" variant="secondary" size="sm" onClick={onPlan}>Изменить план</Button>}
      </section>
      <dl className="grid grid-cols-[110px_minmax(0,1fr)] gap-x-4 gap-y-3 text-sm"><dt className="text-slate-500">Ответственный</dt><dd className="break-words">{lead.assignedAdmin?.name || "Не назначен"}</dd><dt className="text-slate-500">Источник</dt><dd>{sourceLabel(lead.source)}</dd><dt className="text-slate-500">Участники</dt><dd className="grid gap-1">{lead.participants.map((p,i) => <span key={p.id || i}>{p.fullName}</span>)}</dd></dl>
      {(lead.currentTrials ?? []).map(trial => <button key={trial.id} onClick={() => onTrial(trial.id)} className="flex gap-3 rounded-xl border border-slate-200 p-3 text-left text-sm hover:bg-slate-50"><CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-blue-600"/><span><span className="block font-medium">Пробное · {trial.sessionDate}</span><span className="mt-1 block text-xs text-slate-500">{trial.studentName} · {trial.groupName}</span></span></button>)}
      <LeadActions actions={buildLeadUiActions(lead, lead.actions ?? [])} onAction={onAction}/>
    </div>
  </ModalShell>;
}
