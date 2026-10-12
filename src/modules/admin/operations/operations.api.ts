import {apiClient} from "../../../shared/api";
import {companyParams,type CompanyPage,type CompanyMetric} from "../../dispatcher/company/company.api";
import type {OperationsPage,OperationsReport,Assignee,FollowUp,FollowUpCommand} from "../../dispatcher/operations/operations.api";
export const AdminOperationsApi={
 tasks:(options:{branchId:string;kind:string;status?:string;search?:string;mine?:string;page:number})=>apiClient.get<OperationsPage>(`/admin/operations/tasks?${companyParams({...options,size:25})}`),
 assignees:(branchId:string)=>apiClient.get<Assignee[]>(`/admin/operations/assignees?${companyParams({branchId})}`),
 followUp:(id:string)=>apiClient.get<FollowUp>(`/admin/operations/contracts/${id}/follow-up`),
 saveFollowUp:(id:string,c:FollowUpCommand)=>apiClient.post(`/admin/operations/contracts/${id}/follow-up`,c),
 debts:(options:{branchId:string;status:string;search:string;sort:string;page:number})=>apiClient.get<CompanyPage & {totals:CompanyMetric[];summary:Record<string,number>}>(`/admin/operations/debts?${companyParams({...options,size:25})}`),
 capacity:(options:{branchId:string;status:string;search:string;sort:string;page:number})=>apiClient.get<OperationsPage>(`/admin/operations/capacity?${companyParams({...options,size:25})}`),
 report:(options:{branchId?:string;dateFrom:string;dateTo:string})=>apiClient.get<OperationsReport>(`/admin/operations/reports?${companyParams(options)}`),
};
