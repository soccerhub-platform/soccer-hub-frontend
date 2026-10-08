import React from "react";
import { ArrowUpRight, Clock3, MoreHorizontal, Phone, Flag, CalendarDays } from "lucide-react";
import { Button, DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator } from "../../../shared/ui";
import { Table, TableBody, TableRow, TableCell, TableHead, TableHeader } from "../../../shared/ui/shadcn/Table";
import { Lead, LeadAction } from "./types";
import { buildLeadUiActions } from "./lead.ui-actions";
import LeadStatusPill from "./LeadStatusPill";
import { isActiveLead, nextStep, overdue, sourceLabel, PRIORITY_LABELS } from "./lead.workspace";

export const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0,2).map(p => p[0]).join("").toUpperCase();
export const dueLabel = (lead: Lead) => lead.work?.nextActionAt ? new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(lead.work.nextActionAt)) : "";
interface Props {
  leads: Lead[]; onPreview: (lead: Lead) => void; onOpen: (id: string) => void;
  onPlan: (lead: Lead) => void; onContact: (lead: Lead) => void;
  onAction: (lead: Lead, action: LeadAction) => void;
  busyId?: string;
}
export default function LeadList({leads, onPreview, onOpen, onPlan, onContact, onAction, busyId}: Props) {
  const menu = (lead: Lead) => <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="h-8 w-8 shrink-0 p-0" aria-label={`Действия: ${lead.primaryContact.fullName}`}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="w-60"><DropdownMenuGroup>
      <DropdownMenuItem onSelect={() => onOpen(lead.id)}><ArrowUpRight />Полная карточка</DropdownMenuItem>
      {isActiveLead(lead) && <><DropdownMenuItem onSelect={() => onContact(lead)}><Phone />Записать контакт</DropdownMenuItem><DropdownMenuItem onSelect={() => onPlan(lead)}><Clock3 />План работы</DropdownMenuItem></>}
    </DropdownMenuGroup>
      {buildLeadUiActions(lead, lead.actions ?? []).length > 0 && <><DropdownMenuSeparator/><DropdownMenuGroup>{buildLeadUiActions(lead, lead.actions ?? []).map(action => <DropdownMenuItem key={action.type} disabled={!action.enabled || busyId === lead.id} onSelect={() => onAction(lead, action)} className={action.danger ? "text-rose-700" : ""}>{action.label}</DropdownMenuItem>)}</DropdownMenuGroup></>}
    </DropdownMenuContent></DropdownMenu>;
  const identity = (lead: Lead) => <div className="flex min-w-0 items-center gap-3"><span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600">{initials(lead.primaryContact.fullName)}</span>
    <div className="min-w-0"><button onClick={() => onPreview(lead)} className="block max-w-full truncate text-left text-[13px] font-semibold text-slate-900 hover:text-blue-700 focus-visible:outline-blue-600" title={lead.primaryContact.fullName}>{lead.primaryContact.fullName}</button>
      <span className="mt-1 block text-xs tabular-nums text-slate-500">{lead.primaryContact.phone}</span></div></div>;
  const task = (lead: Lead) => <button disabled={!isActiveLead(lead)} onClick={() => onPlan(lead)} className="block max-w-full text-left disabled:cursor-default" title={nextStep(lead)}>
    <span className={`block truncate text-xs ${lead.work?.nextAction ? "text-slate-700" : "text-slate-500"}`}>{nextStep(lead)}</span>
    {isActiveLead(lead) && lead.work?.nextActionAt ? <span className={`mt-1 flex items-center gap-1 text-[11px] ${overdue(lead) ? "font-medium text-rose-700" : "text-slate-500"}`}><Clock3 className="h-3 w-3"/>{overdue(lead) ? "Просрочено · " : ""}{dueLabel(lead)}</span> : isActiveLead(lead) ? <span className="mt-1 block text-[11px] text-slate-500">Запланировать действие</span> : null}
  </button>;
  return <><div className="hidden md:block">
    <Table className="table-fixed"><caption className="sr-only">Лиды: контакт, стадия, следующее действие и ответственный</caption>
      <TableHeader><TableRow className="bg-slate-50/80 hover:bg-slate-50"><TableHead className="w-[29%] text-slate-500 tracking-normal! normal-case!">Контакт / участник</TableHead><TableHead className="w-[20%] text-slate-500 tracking-normal! normal-case!">Стадия</TableHead><TableHead className="w-[27%] text-slate-500 tracking-normal! normal-case!">Следующее действие</TableHead><TableHead className="text-slate-500 tracking-normal! normal-case!">Ответственный</TableHead><TableHead className="w-12"><span className="sr-only">Действия</span></TableHead></TableRow></TableHeader>
      <TableBody>{leads.map(lead => <TableRow key={lead.id} data-lead-id={lead.id} className="group">
        <TableCell className="py-3">{identity(lead)}<p className="ml-12 mt-1 max-w-full truncate text-[11px] text-slate-500" title={lead.participants.map(p => p.fullName).join(", ")}>{lead.participants.map(p => p.fullName).join(", ")}</p></TableCell>
        <TableCell className="py-3"><LeadStatusPill status={lead.status}/><span className="mt-1 block text-[11px] text-slate-500">{sourceLabel(lead.source)}</span></TableCell>
        <TableCell className="py-3">{task(lead)}</TableCell>
        <TableCell className="py-3"><span className="block truncate text-xs text-slate-600" title={lead.assignedAdmin?.name || ""}>{lead.assignedAdmin?.name || lead.assignedAdmin?.email || "Не назначен"}</span>
          {lead.work?.priority && lead.work.priority !== "NORMAL" && isActiveLead(lead) && <span className={`mt-1 flex items-center gap-1 text-[11px] ${lead.work.priority === "URGENT" ? "text-rose-700" : "text-amber-700"}`}><Flag className="h-3 w-3"/>{PRIORITY_LABELS[lead.work.priority]}</span>}
        </TableCell><TableCell className="px-1 py-3">{menu(lead)}</TableCell>
      </TableRow>)}</TableBody>
    </Table></div>
    <div className="divide-y divide-slate-100 md:hidden">{leads.map(lead => <article key={lead.id} data-lead-id={lead.id} className="grid min-w-0 gap-3 p-4">
      <div className="flex min-w-0 items-center justify-between gap-2">{identity(lead)}{menu(lead)}</div>
      <div className="flex flex-wrap items-center gap-2"><LeadStatusPill status={lead.status}/><span className="text-xs text-slate-500">{lead.leadType === "ADULT" ? "Взрослый" : "Детский"}</span></div>
      {task(lead)}{lead.currentTrials?.some(t => t.status === "SCHEDULED") && <div className="flex items-center gap-1 text-xs text-slate-500"><CalendarDays className="h-3 w-3"/>Есть назначенное пробное</div>}
    </article>)}</div></>;
}
