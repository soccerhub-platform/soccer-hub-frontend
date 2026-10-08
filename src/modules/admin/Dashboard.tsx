import React, { useEffect, useState } from "react";
import { ArrowUpRight, Check, ChevronRight, CircleAlert, Clock3, Plus, RefreshCw, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { Button, ErrorState, LoadingState, ModalShell, PageHeader, PageShell } from "../../shared/ui";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../../shared/ui/shadcn/Card";
import { ShadcnButton } from "../../shared/ui/shadcn/Button";
import { ToggleGroup, ToggleGroupItem } from "../../shared/ui/shadcn/toggle-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../shared/ui/shadcn/Table";
import { businessDate, addBusinessDays, sessionTimestamp } from "../../shared/business-time";
import { useAdminBranch } from "./BranchContext";
import { DashboardSummaryApi } from "./dashboard-summary.api";
import type { AdminDashboardSummaryResponse, DashboardSession, DashboardWeeklyDynamics } from "./dashboard-summary.types";
import { dashboardDate, dashboardMoney, dashboardNumber, dashboardSessionState, dashboardSignals, dashboardTime, type DashboardSignal } from "./dashboard.workspace";
import { trialInterval, trialNextStep } from "./trials/trial.workspace";
import TrialPreview from "./trials/TrialPreview";
import "./dashboard.workspace.css";

function Panel({ title, description, action, footer, children, className = "" }: {
  title: string; description: string; action?: React.ReactNode; footer?: React.ReactNode; children: React.ReactNode; className?: string;
}) {
  return <Card className={`dashboard-panel ${className}`}>
    <CardHeader><div className="dashboard-panel-heading"><CardTitle>{title}</CardTitle>{action}</div><CardDescription>{description}</CardDescription></CardHeader>
    <CardContent>{children}</CardContent>{footer && <CardFooter>{footer}</CardFooter>}
  </Card>;
}
const TextLink = ({ to, children }: { to: string; children: React.ReactNode }) => <Link className="dashboard-link" to={to}>{children}<ArrowUpRight aria-hidden="true" className="size-3.5"/></Link>;
const QuietEmpty = ({ title, text }: { title: string; text: string }) => <div className="dashboard-empty"><Check aria-hidden="true" className="size-5"/><strong>{title}</strong><p>{text}</p></div>;

export default function Dashboard() {
  const { branchId, branchName } = useAdminBranch();
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const tick = window.setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(tick); }, []);
  const date = businessDate(new Date(now));
  return <DashboardWorkspace key={`${branchId}:${date}`} branchId={branchId} branchName={branchName} date={date} now={now}/>;
}

function DashboardWorkspace({ branchId, branchName, date, now }: { branchId: string | null; branchName: string | null; date: string; now: number }) {
  const [data, setData] = useState<AdminDashboardSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  const [sessionFilter, setSessionFilter] = useState("all");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [signalId, setSignalId] = useState<string | null>(null);
  const [trialId, setTrialId] = useState<string | null>(null);
  const refresh = () => setRevision(v => v + 1);
  useEffect(() => {
    const interval = window.setInterval(() => { if (!document.hidden) refresh(); }, 60_000);
    const focus = () => refresh();
    window.addEventListener("focus", focus);
    return () => { clearInterval(interval); window.removeEventListener("focus", focus); };
  }, []);
  useEffect(() => {
    if (!branchId) { setLoading(false); return; }
    let active = true;
    setLoading(true); setError(false);
    void DashboardSummaryApi.get(branchId, date, "Asia/Almaty").then(result => {
      if (!active) return;
      if (result.meta.branchId !== branchId || result.meta.date !== date) throw new Error("Wrong dashboard scope");
      setData(result);
    }).catch(() => { if (active) setError(true); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [branchId, date, revision]);
  const scheduleHref = `/admin/schedule?date=${date}&day=${date}`;
  const sessions = [...(data?.todaySchedule.items ?? [])].sort((a, b) => sessionTimestamp(a.startAt) - sessionTimestamp(b.startAt));
  const unclosed = sessions.filter(s => dashboardSessionState(s, now).code === "OVERDUE");
  const upcoming = sessions.filter(s => ["PLANNED", "IN_PROGRESS"].includes(dashboardSessionState(s, now).code));
  const filtered = sessionFilter === "unclosed" ? unclosed : sessionFilter === "upcoming" ? upcoming : sessions;
  const session = sessions.find(s => s.sessionId === sessionId);
  const signals = data ? dashboardSignals(data) : [];
  const signal = signals.find(s => s.id === signalId);
  const trials = [...(data?.todayTrials ?? [])].sort((a, b) => sessionTimestamp(a.sessionStartsAt || "") - sessionTimestamp(b.sessionStartsAt || ""));
  const trialPosition = trials.findIndex(t => t.id === trialId);
  const kpi = (code: string) => data?.kpis.items.find(i => i.code === code);
  const branch = data?.branchSummary;
  const timezone = data?.meta.timezone || "Asia/Almaty";

  return <PageShell className="dashboard-workspace">
    <PageHeader title="Сегодня в клубе" description={`${branchName || "Филиал"} · ${dashboardDate(date, true)} · время Алматы`} actions={<>
      <Button variant="secondary" size="sm" onClick={refresh} disabled={loading} aria-label="Обновить главную"><RefreshCw aria-hidden="true" className={loading ? "size-4 animate-spin" : "size-4"}/>Обновить</Button>
      <ShadcnButton asChild size="sm"><Link to="/admin/leads?action=create"><Plus aria-hidden="true" className="size-4"/>Новый лид</Link></ShadcnButton>
    </>}/>
    {!branchId ? <ErrorState message="Выберите филиал, чтобы открыть рабочий день."/> : !data ? loading ? <LoadingState label="Собираем рабочий день…"/> : <ErrorState message="Не удалось загрузить главную. Показатели не получены." onRetry={refresh}/> : <>
      {error && <div className="dashboard-load-error" role="alert"><CircleAlert aria-hidden="true" className="size-4"/><span>Не удалось обновить данные. Ниже — последний успешный снимок, цифры могут устареть.</span><Button variant="secondary" size="sm" onClick={refresh}>Повторить</Button></div>}
      <div className="dashboard-meta"><span><span className={error ? "dashboard-dot dashboard-dot--stale" : "dashboard-dot"}/>{loading ? "Обновляем…" : error ? "Снимок устарел" : "Данные обновлены"} · {dashboardTime(data.meta.generatedAt, timezone)}</span><span>Автообновление каждую минуту</span></div>
      <section className="dashboard-metrics" aria-label="Сводка за сегодня">
        <Metric title="Новые лиды" value={dashboardNumber(kpi("newLeads")?.value)} note="поступили сегодня" to="/admin/leads?period=TODAY&scope=ALL" delta={kpi("newLeads")?.delta.value}/>
        <Metric title="Занятия" value={dashboardNumber(data.todaySchedule.summary.active)} note={`${dashboardNumber(data.todaySchedule.summary.cancelled)} отменено · ${unclosed.length} не закрыто`} to={scheduleHref}/>
        <Metric title="Пробные" value={data.todayTrials == null ? "—" : dashboardNumber(trials.filter(t => t.status !== "CANCELED").length)} note={data.todayTrials == null ? "данные недоступны" : `${trials.filter(t => t.attendanceStatus === "ATTENDED").length} посетили сегодня`} to="#dashboard-trials"/>
        <Metric title="Поступления" value={dashboardMoney(kpi("paymentsToday")?.amount)} note={`${dashboardNumber(kpi("paymentsToday")?.count)} оплаченных платежей сегодня`} to="/admin/payments"/>
      </section>
      <div className="dashboard-work-grid">
        <div className="dashboard-day-column">
          <Panel title="Занятия сегодня" description={upcoming[0] ? `Ближайшее: ${dashboardTime(upcoming[0].startAt, timezone)} · ${upcoming[0].groupName}` : "Все занятия дня, включая завершённые и отменённые"}
            action={<TextLink to={scheduleHref}>Календарь</TextLink>}
            footer={<span>Показано {filtered.length} из {sessions.length} · нажмите на группу для быстрого просмотра</span>}>
            <ToggleGroup type="single" value={sessionFilter} onValueChange={value => value && setSessionFilter(value)} aria-label="Показать занятия" className="dashboard-tabs">
              <ToggleGroupItem value="all">Все <span>{sessions.length}</span></ToggleGroupItem>
              <ToggleGroupItem value="upcoming">Впереди <span>{upcoming.length}</span></ToggleGroupItem>
              <ToggleGroupItem value="unclosed">Не закрыты <span>{unclosed.length}</span></ToggleGroupItem>
            </ToggleGroup>
            {filtered.length ? <div className="dashboard-session-list">{filtered.map(item => {
              const state = dashboardSessionState(item, now);
              return <button type="button" key={item.sessionId} className="dashboard-session-row" data-selected={sessionId === item.sessionId} onClick={() => setSessionId(item.sessionId)} aria-label={`Просмотр занятия: ${item.groupName}, ${dashboardTime(item.startAt, timezone)}`}>
                <span className="dashboard-session-time"><strong>{dashboardTime(item.startAt, timezone)}</strong><small>{dashboardTime(item.endAt, timezone)}</small></span>
                <span className="dashboard-record"><strong>{item.groupName}</strong><small>{item.coachName}</small></span>
                <span className="dashboard-status" data-tone={state.tone}>{state.label}</span><ChevronRight aria-hidden="true" className="size-4"/>
              </button>;
            })}</div> : <QuietEmpty title={sessions.length ? "В этой категории занятий нет" : "Сегодня занятий нет"} text={sessions.length ? "Выберите другую вкладку, чтобы увидеть остальные записи." : "Проверьте ближайшие дни в календаре занятий."}/>}
          </Panel>
          <div id="dashboard-trials">
            <Panel title="Пробные сегодня" description="Кто придёт познакомиться с клубом и кому нужно записать итог" action={<TextLink to="/admin/trials">Все пробные</TextLink>}>
              {data.todayTrials == null ? <p className="dashboard-note">Сервер не передал пробные. Откройте реестр для проверки.</p> : trials.length ? <div className="dashboard-trial-list">{trials.map(item => {
                const step = trialNextStep(item, now);
                return <button type="button" key={item.id} className="dashboard-trial-row" onClick={() => setTrialId(item.id)} aria-label={`Просмотр пробного: ${item.studentName || item.leadName || "Участник"}`}>
                  <span className="dashboard-avatar" aria-hidden="true"><Users className="size-4"/></span><span className="dashboard-record"><strong>{item.studentName || item.leadName || "Участник пробного"}</strong><small>{trialInterval(item.sessionStartsAt, item.sessionEndsAt)} · {item.groupName || "Группа не указана"}</small><span className="dashboard-trial-step" data-attention={step.attention}>{step.title}{item.nextActionAt && item.result === "FOLLOW_UP" ? ` · срок ${dashboardDate(businessDate(new Date(sessionTimestamp(item.nextActionAt))))} ${dashboardTime(item.nextActionAt)}` : ""}</span></span><ChevronRight aria-hidden="true" className="size-4"/>
                </button>;
              })}</div> : <QuietEmpty title="На сегодня пробных нет" text="Запланируйте пробное из карточки лида. Запись появится здесь в день занятия."/>}
            </Panel>
          </div>
        </div>
        <aside className="dashboard-side-column" aria-label="Контроль филиала">
          <Panel title="Требует внимания" description={signals.length ? `${signals.length} сигналов по филиалу · сначала срочные` : "Операционные сигналы по текущим данным"}>
            {signals.length ? <div className="dashboard-signal-list">{signals.map(item => <button type="button" key={item.id} className="dashboard-signal" onClick={() => setSignalId(item.id)}><span className="dashboard-signal-dot" data-tone={item.tone}/><span><strong>{item.title}</strong><small>{item.deadline}</small></span><ChevronRight aria-hidden="true" className="size-4"/></button>)}</div> : <QuietEmpty title="Сигналов по филиалу нет" text="Дополнительно проверьте результаты пробных и незакрытые занятия в списках слева."/>}
          </Panel>
          <Panel title="Состояние филиала" description="Ученики, тренеры и отмеченная посещаемость">
            <dl className="dashboard-facts"><dt>Всего учеников</dt><dd><Link to="/admin/students">{dashboardNumber(branch?.studentsTotal)}</Link></dd><dt>Новые сегодня</dt><dd>{dashboardNumber(branch?.newStudents)}</dd><dt>Активные группы</dt><dd><Link to="/admin/groups">{dashboardNumber(kpi("activeGroups")?.value)}</Link></dd><dt>Тренеры сегодня</dt><dd><Link to="/admin/coaches">{dashboardNumber(branch?.trainersOnDuty)}</Link></dd><dt>Посещаемость</dt><dd>{branch?.attendancePercent == null ? "—" : `${branch.attendancePercent}%`}</dd></dl>
            <p className="dashboard-note">{branch?.attendancePercent == null ? branch?.trainingsTotal === 0 ? "Сегодня нет занятий для учёта посещаемости." : "Посещаемость ещё не отмечена." : "Доля присутствовавших среди отмеченных учеников. Неотмеченные в расчёт не входят."}</p>
          </Panel>
        </aside>
      </div>
      <div className="dashboard-analysis-grid">
        <Panel title="Лиды по стадиям" description={`Созданы ${dashboardDate(addBusinessDays(date, -27))} — ${dashboardDate(date)} · текущие статусы, не переходы`} action={<TextLink to="/admin/leads?scope=ALL&period=LAST_28_DAYS">Реестр</TextLink>}
          footer={<span>Стали клиентами: {dashboardNumber(data.funnel.conversionToClientPercent)}% от всех лидов этого периода, включая отказы</span>}>
          <div className="dashboard-stages">{data.funnel.rows.map(row => <Link key={row.status} to={`/admin/leads?scope=ALL&period=LAST_28_DAYS&status=${row.status}`} className="dashboard-stage"><span>{row.label}</span><strong>{dashboardNumber(row.count)}</strong><small>{row.percent}%</small></Link>)}</div>
          {!data.funnel.rows.length && <p className="dashboard-note">Распределение не получено.</p>}
        </Panel>
        <Panel title="Последние 7 дней" description={`${dashboardDate(data.weeklyDynamics.period.from)} — ${dashboardDate(data.weeklyDynamics.period.to)} · суммы и количество отдельно`}>
          <WeeklyTable dynamics={data.weeklyDynamics}/>
        </Panel>
      </div>
    </>}
    {session && <SessionQuickView session={session} now={now} timezone={timezone} close={() => setSessionId(null)}/>}
    {signal && <SignalQuickView signal={signal} close={() => setSignalId(null)}/>}
    {trialId && trialPosition >= 0 && <TrialPreview id={trialId} detailHref={`/admin/trials/${trialId}`} position={trialPosition} total={trials.length} onPrevious={() => setTrialId(trials[trialPosition - 1]?.id || trialId)} onNext={() => setTrialId(trials[trialPosition + 1]?.id || trialId)} onClose={() => setTrialId(null)} onSaved={refresh}/>}
  </PageShell>;
}

function Metric({ title, value, note, to, delta }: { title: string; value: string; note: string; to: string; delta?: number }) {
  const content = <><span>{title}</span><strong>{value}</strong><small>{note}{delta != null && delta !== 0 ? ` · ${delta > 0 ? "+" : ""}${dashboardNumber(delta)} к вчера` : ""}</small></>;
  return to.startsWith("#") ? <a className="dashboard-metric" href={to}>{content}</a> : <Link className="dashboard-metric" to={to}>{content}</Link>;
}
function SessionQuickView({ session, now, timezone, close }: { session: DashboardSession; now: number; timezone: string; close: () => void }) {
  const state = dashboardSessionState(session, now);
  const action = state.code === "OVERDUE" ? "Закрыть занятие и проверить журнал" : state.code === "CANCELLED" ? "Занятие отменено" : state.code === "COMPLETED" ? "Проверить итоговый журнал" : "Проверить состав и подготовиться к занятию";
  return <ModalShell title="Быстрый просмотр" description="Занятие · данные и следующий шаг" placement="right" maxWidthClassName="max-w-[460px]" bodyClassName="dashboard-preview" onClose={close} footer={<ShadcnButton asChild className="w-full"><Link to={`/admin/sessions/${session.sessionId}`}>Открыть занятие<ArrowUpRight className="size-4"/></Link></ShadcnButton>}>
    <div className="dashboard-preview-body"><h2>{session.groupName}</h2><span className="dashboard-status" data-tone={state.tone}>{state.label}</span><div className="dashboard-next"><Clock3 aria-hidden="true" className="size-4"/><span><small>Следующее действие</small><strong>{action}</strong></span></div>
      <dl className="dashboard-facts"><dt>Время</dt><dd>{dashboardTime(session.startAt, timezone)}–{dashboardTime(session.endAt, timezone)}<small>Алматы</small></dd><dt>Тренер</dt><dd>{session.coachName}</dd><dt>Группа</dt><dd><Link to={`/admin/groups/${session.groupId}`}>{session.groupName}</Link></dd><dt>Расписание</dt><dd>{session.scheduleType === "REGULAR" ? "Регулярное" : "Разовое / временное"}</dd></dl>
      {state.code !== "CANCELLED" && <TextLink to={`/admin/sessions/${session.sessionId}/attendance`}>Открыть журнал посещений</TextLink>}
    </div>
  </ModalShell>;
}
function SignalQuickView({ signal, close }: { signal: DashboardSignal; close: () => void }) {
  return <ModalShell title="Требует внимания" description="Сигнал по выбранному филиалу" placement="right" maxWidthClassName="max-w-[460px]" bodyClassName="dashboard-preview" onClose={close} footer={<ShadcnButton asChild className="w-full"><Link to={signal.target}>{signal.action}<ArrowUpRight className="size-4"/></Link></ShadcnButton>}>
    <div className="dashboard-preview-body"><span className="dashboard-status" data-tone={signal.tone}>{signal.deadline}</span><h2>{signal.title}</h2><p>{signal.description}</p><p className="dashboard-note">Сигнал обновится после изменения записей. Переход откроет соответствующий раздел.</p></div>
  </ModalShell>;
}
function WeeklyTable({ dynamics }: { dynamics: DashboardWeeklyDynamics }) {
  const dates = [...new Set(dynamics.series.flatMap(s => s.points.map(p => p.date)))].sort();
  const value = (code: string, date: string) => dynamics.series.find(s => s.code === code)?.points.find(p => p.date === date)?.value;
  return dates.length ? <Table className="dashboard-week-table"><TableHeader><TableRow><TableHead>День</TableHead><TableHead>Лиды</TableHead><TableHead>Занятия</TableHead><TableHead>Оплаты, ₸</TableHead></TableRow></TableHeader><TableBody>{dates.map(day => <TableRow key={day}><TableCell>{dashboardDate(day)}</TableCell><TableCell>{dashboardNumber(value("leads", day))}</TableCell><TableCell>{dashboardNumber(value("trainings", day))}</TableCell><TableCell>{dashboardNumber(value("payments", day))}</TableCell></TableRow>)}</TableBody></Table> : <p className="dashboard-note">Динамика за период не получена.</p>;
}
