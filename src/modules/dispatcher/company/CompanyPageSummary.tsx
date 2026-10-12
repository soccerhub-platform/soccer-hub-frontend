import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "../../../shared/ui";
import { MetricCard } from "../ui/DispatcherPresentation";
import { CompanyApi, CompanyKind, dateLabel } from "./company.api";
import { metricAmounts, metricCount } from "./company.metrics";
import { isValidPeriod } from "./company.filters";
import { useDispatcherScope } from "./DispatcherScope";

type Props = { kind: CompanyKind; dateFrom: string; dateTo: string };
type Metric = { title: string; value: React.ReactNode; note: string; warning?: boolean };

export default function CompanyPageSummary({ kind, dateFrom, dateTo }: Props) {
  const { branchId, branches, ready } = useDispatcherScope();
  const valid = isValidPeriod(dateFrom, dateTo, true);
  const query = useQuery(
    ["dispatcher", "company-summary", branchId, dateFrom, dateTo],
    () => CompanyApi.summary({ branchId, dateFrom, dateTo }),
    { enabled: ready && valid },
  );
  if (!valid) return null;
  const metrics = query.data?.metrics || [];
  const count = (key: string) => metricCount(metrics, key);
  const amount = (key: string) => <span className="block break-words text-lg">{metricAmounts(metrics, key)}</span>;
  const period = !dateFrom && !dateTo ? "За всё время" : `${dateLabel(dateFrom)} — ${dateLabel(dateTo)}`;
  const cards: Metric[] = kind === "students" ? [
    { title: "Ученики", value: count("students"), note: "Все ученики в выбранной области" },
    { title: "Действующие договоры", value: count("activeContracts"), note: "На сегодня" },
    { title: "Филиалы", value: query.data?.branches.length || 0, note: "В выбранной области, включая архив" },
  ] : kind === "contracts" ? [
    { title: "Действующие договоры", value: count("activeContracts"), note: "На сегодня" },
    { title: "Заканчиваются", value: count("endingContracts"), note: "В ближайшие 14 дней", warning: count("endingContracts") > 0 },
    { title: "С задолженностью", value: count("debt"), note: "Начавшиеся договоры с остатком к оплате", warning: count("debt") > 0 },
    { title: "Общий долг", value: amount("debt"), note: "На сегодня, отдельно по валютам", warning: count("debt") > 0 },
  ] : kind === "payments" ? [
    { title: "Получено", value: amount("receipts"), note: "Без отменённых оплат" },
    { title: "Успешные оплаты", value: count("receipts"), note: "За выбранный период" },
    { title: "Отменённые оплаты", value: count("cancelledPayments"), note: "За выбранный период" },
  ] : kind === "debts" ? [
    { title: "Общая задолженность", value: amount("debt"), note: "На сегодня, отдельно по валютам", warning: count("debt") > 0 },
    { title: "Договоры с долгом", value: count("debt"), note: "Начавшиеся договоры с остатком к оплате" },
  ] : [
    { title: "Создано заявок", value: count("newLeads"), note: period },
    { title: "Стали клиентами", value: count("convertedLeads"), note: "Из заявок, созданных за этот период" },
    { title: "Без администратора", value: count("unassignedLeads"), note: "Все незавершённые заявки на сегодня", warning: count("unassignedLeads") > 0 },
    { title: "Просроченные задачи", value: count("overdueTasks"), note: "Все незавершённые заявки на сегодня", warning: count("overdueTasks") > 0 },
  ];
  return <section aria-label="Сводная информация" className="flex min-w-0 flex-col gap-2">
    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
      <p>Сводка · {branchId ? branches.find(branch => branch.branchId === branchId)?.name : "Вся компания"}{kind === "payments" ? ` · ${period}` : ""}</p>
      {query.isError && <div role="alert" className="flex items-center gap-2"><span>Не удалось загрузить сводку</span><Button variant="ghost" size="sm" onClick={() => void query.refetch()}>Повторить</Button></div>}
    </div>
    <div className="grid min-w-0 grid-cols-2 overflow-hidden rounded-xl border border-border bg-background [&>*]:border-b [&>*]:border-r [&>*]:border-border sm:grid-cols-[repeat(var(--summary-columns),minmax(0,1fr))]" style={{ "--summary-columns": cards.length } as React.CSSProperties}>
      {cards.map(card => <MetricCard key={card.title} {...card} tone={card.warning ? "warning" : "neutral"} loading={!ready || !query.isSuccess} />)}
    </div>
  </section>;
}
