import { apiClient } from "../../../shared/api";
import { companyParams, type CompanyEntry, type CompanySummary, type CompanyMetric } from "../company/company.api";
import type { LeadDetails, LeadActivity, LeadWorkCommand } from "../../admin/leads/types";
import type { TrialBookingListItem, TrialDetails, TrialNextActionType, TrialResult, TrialAttendanceStatus } from "../../admin/trials/trials.types";
export interface Assignee { id:string;firstName:string;lastName:string }
export interface TimelineEvent {id?:string;type:string;description:string;occurredAt?:string;actorId?:string}
export interface FollowUp {contractId:string;ownerId?:string;nextAction?:string;dueAt?:string;outcome?:string;promisedPaymentDate?:string;lastContactAt?:string;version:number;history:TimelineEvent[]}
export interface FollowUpCommand {operation:"PLAN"|"CONTACT"|"COMPLETE";version:number;ownerId?:string|null;nextAction?:string|null;dueAt?:string|null;outcome?:string;promisedPaymentDate?:string|null;comment?:string}
export interface OperationsRow {id:string;branchId:string;kind:"LEAD"|"CONTRACT"|"TRIAL"|"GROUP";name?:string;contact?:string;phone?:string;status:string;ownerId?:string;ownerName?:string;nextAction?:string;dueAt?:string;priority?:string;reference?:string;occupied?:number;capacity?:number;startsAt?:string;coachName?:string}
export interface OperationsPage {content:OperationsRow[];totalElements:number;totalPages:number;number:number;size:number;summary?:Record<string,number>}
export interface TrialPage {content:TrialBookingListItem[];totalElements:number;totalPages:number;summary:Record<string,number>}
export interface TrialWorkspace {details:TrialDetails;version:number;history:TimelineEvent[]}
export interface ContractHistoryItem {id:string;contractNumber:string;status:string;amount:number;currency:string;outstandingAmount:number;paidAmount:number;startDate:string;endDate?:string}
export interface StudentHistory {student:CompanyEntry;contracts:ContractHistoryItem[];payments:CompanyEntry[];leads:LeadDetails[];events:TimelineEvent[];trials:TrialBookingListItem[]}
export interface OperationsReport {current:CompanySummary;previous:CompanySummary|null;pipeline:CompanyMetric[];lossReasonNames?:Record<string,string>;debtTrend:Array<{branchId:string;date:string;currency:string;count:number;amount:number}>}
export interface TrialCommand {operation:"ATTENDANCE"|"RESULT";version:number;attendance?:TrialAttendanceStatus;result?:TrialResult;nextActionType?:TrialNextActionType;nextActionAt?:string|null;comment?:string}
export const OperationsApi={
 assignees:(branchId:string)=>apiClient.get<Assignee[]>(`/dispatcher/operations/assignees?${companyParams({branchId})}`),
 lead:(id:string)=>apiClient.get<{lead:LeadDetails;branchId:string}>(`/dispatcher/leads/${id}`),
 activities:(id:string)=>apiClient.get<LeadActivity[]>(`/dispatcher/leads/${id}/activities`),
 leadWork:(id:string,c:LeadWorkCommand)=>apiClient.post(`/dispatcher/leads/${id}/work`,c),
 routeLead:(id:string,c:{branchId:string;adminId?:string|null;version:number;reason:string})=>apiClient.post(`/dispatcher/leads/${id}/routing`,c),
 contract:(id:string)=>apiClient.get<CompanyEntry>(`/dispatcher/operations/contracts/${id}`),
 followUp:(id:string)=>apiClient.get<FollowUp>(`/dispatcher/operations/contracts/${id}/follow-up`),
 saveFollowUp:(id:string,c:FollowUpCommand)=>apiClient.post(`/dispatcher/operations/contracts/${id}/follow-up`,c),
 tasks:(options:{branchId?:string;kind:string;status?:string;search?:string;page:number})=>apiClient.get<OperationsPage>(`/dispatcher/operations/tasks?${companyParams({...options,size:25})}`),
 capacity:(options:{branchId?:string;status?:string;search?:string;sort?:string;page:number})=>apiClient.get<OperationsPage>(`/dispatcher/operations/capacity?${companyParams({...options,size:25})}`),
 trials:(options:{branchId?:string;status?:string;dateFrom:string;dateTo:string;page:number})=>apiClient.get<TrialPage>(`/dispatcher/operations/trials?${companyParams({...options,size:25})}`),
 trial:(id:string)=>apiClient.get<TrialWorkspace>(`/dispatcher/operations/trials/${id}`),
 saveTrial:(id:string,c:TrialCommand)=>apiClient.post(`/dispatcher/operations/trials/${id}`,c),
 student:(id:string)=>apiClient.get<StudentHistory>(`/dispatcher/operations/students/${id}`),
 report:(options:{branchId?:string;dateFrom:string;dateTo:string})=>apiClient.get<OperationsReport>(`/dispatcher/operations/reports?${companyParams(options)}`),
};
