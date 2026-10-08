import React from "react";
import { CalendarDays, Check, ClipboardCheck, Flag } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../shared/ui/shadcn/Card";
import type { TrialDetails } from "./trials.types";
import { attendanceLabels, resultLabels, trialStatusLabels } from "./trials.api";
import { formatTrialDate, trialInterval } from "./trial.workspace";

export function TrialCard({ title, description, children, action }: { title: string; description?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return <Card><CardHeader><div className="flex flex-wrap items-center justify-between gap-2"><CardTitle>{title}</CardTitle>{action}</div>{description && <CardDescription>{description}</CardDescription>}</CardHeader><CardContent>{children}</CardContent></Card>;
}
export function TrialFacts({ items }: { items: { label: string; value: React.ReactNode }[] }) {
  return <dl className="trial-facts">{items.map(item => <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl>;
}
export function TrialContext({ trial }: { trial: TrialDetails }) {
  return <div className="trial-context"><CalendarDays aria-hidden="true"/><div><strong>{trial.student?.fullName || trial.lead?.fullName || "Участник пробного"}</strong><p>{trial.group?.name || "Группа не указана"} · {formatTrialDate(trial.session?.date)}</p><p>{trialInterval(trial.session?.startsAt, trial.session?.endsAt)} · Алматы</p></div></div>;
}
export function TrialProgress({ trial }: { trial: TrialDetails }) {
  const stages = [
    { label: "Запись", value: trialStatusLabels[trial.status], done: true, icon: CalendarDays },
    { label: "Посещение", value: attendanceLabels[trial.attendanceStatus], done: trial.attendanceStatus !== "UNMARKED", icon: ClipboardCheck },
    { label: "Результат", value: resultLabels[trial.result], done: trial.result !== "PENDING", icon: Flag },
  ];
  return <ol className="trial-progress" aria-label="Этапы пробного">{stages.map(({ label, value, done, icon: Icon }) => <li key={label} data-done={done} data-canceled={trial.status === "CANCELED"}><span className="trial-stage-icon">{done ? <Check aria-hidden="true"/> : <Icon aria-hidden="true"/>}</span><div><span>{label}</span><strong>{value}</strong></div></li>)}</ol>;
}
