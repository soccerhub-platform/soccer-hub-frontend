import { CompanyMetric, money } from "./company.api";

export function metricCount(metrics: CompanyMetric[], key: string): number {
  return metrics.filter(metric => metric.key === key).reduce((total, metric) => total + metric.count, 0);
}

export function metricAmounts(metrics: CompanyMetric[], key: string): string {
  const amounts = new Map<string, number>();
  metrics.filter(metric => metric.key === key && metric.amount != null).forEach(metric => {
    const currency = metric.currency || "";
    amounts.set(currency, (amounts.get(currency) || 0) + Number(metric.amount));
  });
  return amounts.size ? Array.from(amounts, ([currency, amount]) => money(amount, currency)).join(" · ") : "0";
}
