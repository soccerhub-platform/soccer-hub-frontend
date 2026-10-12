import { LEAD_STATUS_LABELS } from "../leads/lead.status";
import { isCalendarDate } from "./company.filters";
import { apiClient } from "../../../shared/api";
export type CompanyKind = "students" | "contracts" | "payments" | "leads" | "debts";
export interface CompanyBranch { id: string; name: string; active: boolean; managerAdminId?: string | null }
export interface CompanyEntry {
 ownerId?:string;ownerName?:string;nextAction?:string;dueAt?:string;lastContactAt?:string;priority?:string;
 id: string; branchId: string; reference?: string; name?: string; contact?: string; phone?: string; email?: string;
 participants?: Array<{fullName:string; birthDate?:string}>; status: string; birthDate?: string; startDate?: string; endDate?: string; amount?: number; currency?: string; eventDate?: string; notes?: string;
}
export interface CompanyPage { content: CompanyEntry[]; totalElements: number; totalPages: number; number: number; size: number }
export interface CompanyMetric { branchId: string; key: string; count: number; currency?: string; amount?: number }
export interface CompanySummary { branches: CompanyBranch[]; metrics: CompanyMetric[]; dateFrom: string | null; dateTo: string | null }
export function companyParams(options: Record<string, string | number | undefined>) {
 const params = new URLSearchParams();
 Object.entries(options).forEach(([key,value]) => { if (value !== undefined && value !== "") params.set(key,String(value)); });
 return params.toString();
}
export const CompanyApi = {
 summary: (options: {branchId?: string; dateFrom: string; dateTo: string}) => apiClient.get<CompanySummary>(`/dispatcher/company/summary?${companyParams(options)}`),
 page: (kind: CompanyKind, options: {branchId?: string; search?: string; status?: string; attention?: string; dateFrom?: string; dateTo?: string; sort?: string; page: number}) => apiClient.get<CompanyPage>(`/dispatcher/company/${kind}?${companyParams({...options,size:25})}`),
};
export const money = (amount?: number, currency?: string) => amount == null ? "—" : `${new Intl.NumberFormat("ru-RU",{maximumFractionDigits:2}).format(amount)} ${currency || ""}`;
export const dateLabel = (value?: string | null) => value && isCalendarDate(value.slice(0,10)) ? new Intl.DateTimeFormat("ru-RU",{timeZone:"UTC",day:"2-digit",month:"short",year:"numeric"}).format(new Date(`${value.slice(0,10)}T12:00:00Z`)) : "—";
export const STATUS_LABELS: Record<string,string> = { DRAFT:"Черновик",UPCOMING:"Предстоящий",ACTIVE:"Действует",EXPIRED:"Истёк",CANCELLED:"Отменён",PAID:"Оплачен",...LEAD_STATUS_LABELS,INACTIVE:"Неактивен" };
