import React, { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, RefreshCw, Search, UserRoundPlus, X } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { getApiErrorMessage } from "../../../shared/api";
import { Button, EmptyState, ErrorState, LoadingState, PageHeader, PageShell, StatusBadge } from "../../../shared/ui";
import { ShadcnButton } from "../../../shared/ui/shadcn/Button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "../../../shared/ui/shadcn/input-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../shared/ui/shadcn/Table";
import { ToggleGroup, ToggleGroupItem } from "../../../shared/ui/shadcn/toggle-group";
import { TrialsApi, attendanceLabels, resultLabels, trialStatusLabels, trialStatusTone } from "./trials.api";
import type { TrialBookingListItem, TrialBookingStatus, TrialsPageResponse } from "./trials.types";
import { formatTrialDate, nextActionLabels, trialInterval, trialMatches, trialNextStep } from "./trial.workspace";

import TrialPreview from "./TrialPreview";

const statusOptions = { all: "Все пробные", SCHEDULED: "Запланированы", COMPLETED: "Завершены", CANCELED: "Отменены" };

const TrialsPage: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState<TrialsPageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const requested = params.get("status");
  const status = requested && Object.prototype.hasOwnProperty.call(trialStatusLabels, requested) ? requested as TrialBookingStatus : "all";
  const rawPage = Number(params.get("page"));
  const page = Number.isSafeInteger(rawPage) && rawPage >= 0 ? rawPage : 0;
  const query = params.get("q") || "";
  const attentionOnly = params.get("attention") === "true";

  useEffect(() => {
    let active = true;
    setLoading(true); setError(null);
    void TrialsApi.list({ status, page, size: 20 }).then(result => {
      if (!active) return;
      const lastPage = Math.max(0, result.totalPages - 1);
      if (page > lastPage) {
        setParams(current => { const next = new URLSearchParams(current); if (lastPage) next.set("page", String(lastPage)); else next.delete("page"); return next; }, { replace: true });
      } else setData(result);
    }).catch(reason => { if (active) setError(getApiErrorMessage(reason, "Не удалось загрузить пробные занятия")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, status, revision]);

  const change = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value && value !== "all" && value !== "false") next.set(key, value); else next.delete(key);
    if (key === "status" || key === "page") setPreviewId(null);
    if (key === "status") { next.delete("page"); next.delete("q"); next.delete("attention"); }
    if (key === "page") { next.delete("q"); next.delete("attention"); }
    setParams(next, { replace: key === "q" });
  };
  const resetLocal = () => { const next = new URLSearchParams(params); next.delete("q"); next.delete("attention"); setParams(next); };
  const items = data?.content ?? [];
  const visible = useMemo(() => items.filter(item => trialMatches(item, query) && (!attentionOnly || trialNextStep(item).attention)), [items, query, attentionOnly]);
  const attention = items.filter(item => trialNextStep(item).attention).length;
  const previewIndex = visible.findIndex(item => item.id === previewId);
  const preview = previewIndex >= 0 ? visible[previewIndex] : null;
  const returnTo = "/admin/trials" + (params.toString() ? "?" + params.toString() : "");
  const href = (item: TrialBookingListItem) => "/admin/trials/" + item.id + "?returnTo=" + encodeURIComponent(returnTo);

  return <PageShell className="trial-workspace">
    <PageHeader title="Пробные занятия" description="От первой записи до решения клиента · Время Алматы" actions={<>
      <ShadcnButton asChild variant="secondary"><Link to="/admin/schedule"><CalendarDays data-icon="inline-start"/>Расписание</Link></ShadcnButton>
      <ShadcnButton asChild><Link to="/admin/leads"><UserRoundPlus data-icon="inline-start"/>Записать из лида</Link></ShadcnButton>
    </>}/>
    <section className="trial-register" aria-label="Реестр пробных">
      <div className="trial-register-toolbar">
        <ToggleGroup type="single" value={status} onValueChange={value => value && change("status", value)} className="flex-wrap justify-start" aria-label="Статус пробного занятия">
          {Object.entries(statusOptions).map(([value, label]) => <ToggleGroupItem key={value} value={value}>{label}</ToggleGroupItem>)}
        </ToggleGroup>
        <Button variant="ghost" size="sm" disabled={loading} onClick={() => setRevision(v => v + 1)} aria-label="Обновить пробные"><RefreshCw data-icon="inline-start"/></Button>
      </div>
      <div className="trial-register-search">
        <InputGroup><InputGroupAddon><Search aria-hidden="true"/></InputGroupAddon><InputGroupInput aria-label="Поиск на текущей странице" placeholder="Имя, контакт, группа или тренер на этой странице…" value={query} onChange={e => change("q", e.target.value)}/>{query && <InputGroupAddon align="inline-end"><Button size="sm" variant="ghost" aria-label="Очистить поиск" onClick={() => change("q", "")}><X data-icon="inline-start"/></Button></InputGroupAddon>}</InputGroup>
        <Button variant={attentionOnly ? "soft" : "secondary"} aria-pressed={attentionOnly} onClick={() => change("attention", String(!attentionOnly))} disabled={loading}>Требуют внимания{!loading && !error ? " · " + attention : ""}</Button>
      </div>
      <div className="trial-register-summary" aria-live="polite"><span>{loading ? "Обновляем реестр…" : error ? "Не удалось обновить данные" : <>Всего по статусу: <strong>{data?.totalElements ?? 0}</strong> · На странице: {visible.length} из {items.length}</>}</span><span>Поиск и «Требуют внимания» — на текущей странице</span></div>
      {loading ? <div className="p-4"><LoadingState label="Загрузка пробных занятий…"/></div> : error ? <div className="p-4"><ErrorState title="Пробные недоступны" message={error} onRetry={() => setRevision(v => v + 1)}/></div> : !visible.length ? <div className="p-5"><EmptyState title={query || attentionOnly ? "На этой странице нет совпадений" : "Пробных с таким статусом пока нет"} description={query || attentionOnly ? "Измените запрос, сбросьте локальные фильтры или перейдите на другую страницу." : "Запись на пробное создаётся в карточке лида для конкретного ученика и занятия."} action={query || attentionOnly ? <Button variant="secondary" onClick={resetLocal}>Сбросить поиск и фильтр</Button> : <ShadcnButton asChild variant="secondary"><Link to="/admin/leads">Перейти к лидам</Link></ShadcnButton>}/></div> : <>
        <div className="trial-desktop-list"><Table><TableHeader><TableRow><TableHead>Ученик / контакт</TableHead><TableHead>Занятие</TableHead><TableHead>Состояние</TableHead><TableHead>Следующий шаг</TableHead><TableHead><span className="sr-only">Открыть</span></TableHead></TableRow></TableHeader><TableBody>
          {visible.map(item => <TableRow key={item.id} data-selected={item.id === previewId}><TableCell><button type="button" className="trial-person-link" aria-label={"Просмотр пробного: " + (item.studentName || item.leadName || "участник")} onClick={() => setPreviewId(item.id)}>{item.studentName || item.leadName || "Участник пробного"}</button><p className="trial-secondary">{item.leadPhone || item.leadEmail || "Не указан"}</p></TableCell>
            <TableCell><strong className="trial-cell-title">{formatTrialDate(item.sessionDate)} · {trialInterval(item.sessionStartsAt, item.sessionEndsAt)}</strong><p className="trial-secondary">{item.groupName || "Без группы"} · {item.coachName || "Без тренера"}</p>{item.locationName && <p className="trial-secondary">{item.locationName}</p>}</TableCell>
            <TableCell><StatusBadge tone={trialStatusTone[item.status]}>{trialStatusLabels[item.status]}</StatusBadge>{item.status !== "CANCELED" && <p className="trial-secondary">{attendanceLabels[item.attendanceStatus]}</p>}{item.result !== "PENDING" && <p className="trial-secondary">{resultLabels[item.result]}</p>}</TableCell>
            <TableCell><NextStep item={item}/></TableCell><TableCell><Link className="trial-open-link" to={href(item)} aria-label={"Открыть пробное: " + (item.studentName || item.leadName || "участник")}><ChevronRight aria-hidden="true"/></Link></TableCell></TableRow>)}
        </TableBody></Table></div>
        <div className="trial-mobile-list">{visible.map(item => <article key={item.id} className="trial-mobile-card"><div className="flex items-start justify-between gap-3"><button type="button" className="trial-person-link" aria-label={"Просмотр пробного: " + (item.studentName || item.leadName || "участник")} onClick={() => setPreviewId(item.id)}>{item.studentName || item.leadName || "Участник пробного"}</button><StatusBadge tone={trialStatusTone[item.status]}>{trialStatusLabels[item.status]}</StatusBadge></div><p className="trial-secondary">{item.leadPhone || item.leadEmail || "Контакт не указан"}</p><div className="trial-mobile-session"><strong>{formatTrialDate(item.sessionDate)} · {trialInterval(item.sessionStartsAt, item.sessionEndsAt)}</strong><p>{item.groupName || "Без группы"} · {item.coachName || "Без тренера"}</p></div><NextStep item={item}/><Link className="trial-text-link" to={href(item)}>Открыть пробное <ChevronRight aria-hidden="true"/></Link></article>)}</div>
      </>}
      {!loading && !error && data && <nav className="trial-pagination" aria-label="Страницы пробных"><span>Страница {data.number + 1} из {Math.max(data.totalPages, 1)}</span><div className="flex gap-2"><Button variant="secondary" size="sm" disabled={page <= 0} onClick={() => change("page", String(page - 1))}><ChevronLeft data-icon="inline-start"/>Назад</Button><Button variant="secondary" size="sm" disabled={page + 1 >= data.totalPages} onClick={() => change("page", String(page + 1))}>Далее<ChevronRight data-icon="inline-end"/></Button></div></nav>}
    </section>
    {preview && <TrialPreview key={preview.id} id={preview.id} detailHref={href(preview)} position={previewIndex} total={visible.length} onPrevious={() => setPreviewId(visible[previewIndex - 1]?.id || preview.id)} onNext={() => setPreviewId(visible[previewIndex + 1]?.id || preview.id)} onClose={() => setPreviewId(null)} onSaved={() => setRevision(v => v + 1)}/>}
  </PageShell>;
};

function NextStep({ item }: { item: TrialBookingListItem }) {
  const next = trialNextStep(item);
  if (item.status === "CANCELED") return <span className="trial-secondary">Действий нет</span>;
  return <div className="trial-next-cell" data-attention={next.attention}><strong>{next.title}</strong><span>{item.result === "FOLLOW_UP" && item.nextActionAt ? (item.nextActionType ? nextActionLabels[item.nextActionType] : "Контакт") + " · " + formatTrialDate(item.nextActionAt, true) : next.description}</span></div>;
}
export default TrialsPage;
