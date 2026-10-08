import React from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, CalendarDays, Mail, Phone, Users } from "lucide-react";
import { Button } from "../../../shared/ui";
import type { LeadActivity, LeadDetails } from "./types";
import { contactLinks, isActiveLead, sourceLabel } from "./lead.workspace";
import { experienceLabel, formatBirthDate, formatLeadDateTime, formatPreferredDays, formatTrialTime, participantGenderLabel, trialStatusLabel } from "./lead.format";
import LeadTimeline from "./LeadTimeline";

interface Props {
  lead: LeadDetails; activities: LeadActivity[]; activitiesLoading: boolean; activitiesError: string | null;
  onQualify: () => void; onPreferences: () => void; onActivity: () => void; onTrial: (id: string) => void;
}
const Panel = ({title,action,children}: {title:string;action?:React.ReactNode;children:React.ReactNode}) =>
  <section className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4"><h2 className="text-sm font-semibold text-slate-900">{title}</h2>{action}</div>
    <div className="p-5">{children}</div>
  </section>;
const Meta = ({label,children}: {label:string;children:React.ReactNode}) => <div className="grid grid-cols-[110px_minmax(0,1fr)] gap-3 text-sm"><dt className="text-slate-600">{label}</dt><dd className="wrap-break-word text-slate-900">{children}</dd></div>;

export default function LeadDetailOverview({lead,activities,activitiesLoading,activitiesError,onQualify,onPreferences,onActivity,onTrial}: Props) {
  const links = contactLinks(lead);
  const canEdit = lead.status === "NEW" || lead.status === "IN_PROGRESS";
  const notes = lead.notes || lead.qualificationData?.notes;
  const time = lead.timePreference || lead.qualificationData?.timePreference;
  const timeLabel = time ? {MORNING:"Утром",AFTERNOON:"Днём",EVENING:"Вечером"}[time] : "Не уточнено";
  return <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
    <div className="flex min-w-0 flex-col gap-5">
      <Panel title={`Участники заявки · ${lead.participants.length}`} action={canEdit && <Button variant="ghost" size="sm" onClick={onQualify}>Уточнить заявку</Button>}>
        <div className="flex flex-col gap-4">{lead.participants.map((p,i)=><div key={p.id || i} className="flex min-w-0 items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600"><Users className="size-4"/></div>
          <div className="min-w-0 flex-1"><h3 className="wrap-break-word text-sm font-semibold text-slate-900">{p.fullName}</h3>
            <p className="mt-1 text-xs leading-5 text-slate-600">{formatBirthDate(p.birthDate)} · {participantGenderLabel(p.gender,lead.leadType)} · {experienceLabel(p.experience)}</p>
            {p.playerId && <Link className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:underline" to={`/admin/students/${p.playerId}/overview`}>Карточка ученика<ArrowUpRight className="size-3"/></Link>}
          </div>
        </div>)}{!lead.participants.length && <p className="text-sm text-slate-600">Добавьте участника, чтобы подобрать пробное и оформить ученика.</p>}</div>
      </Panel>
      <Panel title="Пробные занятия">
        <div className="flex flex-col gap-4">{(lead.currentTrials ?? []).map(t=><div key={t.id} className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 gap-3"><CalendarDays className="mt-0.5 size-5 shrink-0 text-slate-600"/><div className="min-w-0">
            <p className="text-sm font-medium text-slate-900">{formatTrialTime(t.sessionDate ?? undefined,t.sessionStartsAt?.slice(11,16),t.sessionEndsAt?.slice(11,16))}</p>
            <p className="mt-1 wrap-break-word text-xs text-slate-600">{t.studentName || lead.participants.find(p=>p.id===t.participantId)?.fullName || "Участник"} · {t.groupName || "Группа не указана"}</p>
            <p className="mt-1 text-xs text-slate-600">{trialStatusLabel(t.status)}{t.coachName ? ` · ${t.coachName}` : ""}</p>
          </div></div><Button variant="secondary" size="sm" onClick={()=>onTrial(t.id)}>Открыть пробное</Button>
        </div>)}{!lead.currentTrials?.length && <p className="text-sm leading-6 text-slate-600">Пробное ещё не назначено. {isActiveLead(lead) ? "Выберите занятие или оформите участника без пробного, если это доступно на текущем этапе." : "Новых пробных по закрытой заявке нет."}</p>}</div>
      </Panel>
      <Panel title="Пожелания к занятиям" action={isActiveLead(lead) && <Button variant="ghost" size="sm" onClick={onPreferences}>Редактировать пожелания</Button>}>
        <dl className="flex flex-col gap-3"><Meta label="Дни недели">{formatPreferredDays(lead.preferredDays || lead.qualificationData?.preferredDays)}</Meta><Meta label="Время">{timeLabel}</Meta><Meta label="Подготовка">{experienceLabel(lead.experience || lead.qualificationData?.experience)}</Meta></dl>
        {notes && <p className="mt-4 whitespace-pre-wrap wrap-break-word border-t border-slate-100 pt-4 text-sm leading-6 text-slate-700">{notes}</p>}
        {!isActiveLead(lead) && <p className="mt-4 text-xs text-muted-foreground">Лид закрыт. Пожелания сохранены для истории.</p>}
      </Panel>
      <Panel title="Последние события" action={<Button variant="ghost" size="sm" onClick={onActivity}>Вся история</Button>}>
        <LeadTimeline activities={activities.slice(0,3)} loading={activitiesLoading} error={activitiesError}/>
      </Panel>
    </div>
    <div className="flex min-w-0 flex-col gap-5">
      <Panel title={lead.leadType === "ADULT" ? "Контактное лицо" : "Родитель / представитель"}>
        <p className="mb-4 wrap-break-word text-sm font-semibold text-slate-900">{lead.primaryContact.fullName}</p>
        <div className="flex flex-col gap-3 text-sm"><a className="flex items-center gap-2 text-blue-700 hover:underline" href={links.phone}><Phone className="size-4 shrink-0"/>{lead.primaryContact.phone}</a>
          {links.email && <a className="flex min-w-0 items-center gap-2 text-blue-700 hover:underline" href={links.email}><Mail className="size-4 shrink-0"/><span className="break-all">{lead.primaryContact.email}</span></a>}
          {links.whatsapp && <a className="text-xs font-medium text-blue-700 hover:underline" href={links.whatsapp} target="_blank" rel="noopener noreferrer">Открыть WhatsApp ↗</a>}
        </div>
        {lead.clientId && <Link className="mt-4 inline-flex text-sm font-medium text-blue-700 hover:underline" to={`/admin/clients/${lead.clientId}/overview`}>Карточка клиента ↗</Link>}
      </Panel>
      <Panel title="Обращение"><dl className="flex flex-col gap-4">
        <Meta label="Ответственный">{lead.assignedAdmin?.name || lead.assignedAdmin?.email || "Не назначен"}</Meta>
        <Meta label="Источник">{sourceLabel(lead.source)}</Meta><Meta label="Направление">{lead.leadType === "ADULT" ? "Взрослый футбол" : "Детский футбол"}</Meta>
        <Meta label="Создано">{formatLeadDateTime(lead.createdAt)}</Meta>
        {lead.work?.lastContactAt && <Meta label="Контакт">{formatLeadDateTime(lead.work.lastContactAt)}</Meta>}
      </dl></Panel>
      {lead.comment && <Panel title="Комментарий к заявке"><p className="whitespace-pre-wrap wrap-break-word text-sm leading-6 text-slate-700">{lead.comment}</p></Panel>}
      {lead.status === "LOST" && <Panel title="Причина закрытия"><p className="text-sm font-medium text-slate-900">{lead.lostReasonName || lead.lostReasonCode || "Не указана"}</p>{lead.lostComment && <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{lead.lostComment}</p>}{lead.lostAt && <p className="mt-3 text-xs text-slate-600">{formatLeadDateTime(lead.lostAt)}</p>}</Panel>}
    </div>
  </div>;
}
