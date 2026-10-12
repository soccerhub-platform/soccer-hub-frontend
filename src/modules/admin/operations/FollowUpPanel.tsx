import { SectionCard } from "../AdminPresentation";
import {useQuery,useQueryClient} from "@tanstack/react-query";
import { ErrorState, LoadingState } from "../../../shared/ui";
import {getApiErrorMessage} from "../../../shared/api";

import {AdminOperationsApi} from "./operations.api";
import {dateTime,OUTCOMES} from "../../dispatcher/operations/operations.format";
import {dateLabel} from "../../dispatcher/company/company.api";
import type {FollowUpCommand} from "../../dispatcher/operations/operations.api";
import Timeline from "../../dispatcher/operations/Timeline";
import WorkForm from "../../dispatcher/operations/WorkForm";
import {useEmployeeAccess} from "../../../shared/useEmployeeAccess";
export default function FollowUpPanel({id,branchId,status}:{id:string;branchId:string;status:string}) {
 const client=useQueryClient();const access=useEmployeeAccess();const q=useQuery(["admin","follow-up",id],()=>AdminOperationsApi.followUp(id));const f=q.data;
 return q.isError?<ErrorState message={getApiErrorMessage(q.error)} onRetry={()=>void q.refetch()}/>:q.isLoading?<LoadingState label="Загрузка сопровождения…"/>:f?<><SectionCard title="Сопровождение договора"><p className="mb-3 text-xs text-muted-foreground">Последний контакт: {dateTime(f.lastContactAt)}{f.outcome&&` · ${OUTCOMES[f.outcome]||f.outcome}`}{f.promisedPaymentDate&&` · обещана оплата ${dateLabel(f.promisedPaymentDate)}`}</p>{access.can("CONTRACTS_WRITE")&&!['DRAFT','CANCELLED'].includes(status)?<WorkForm key={f.version} kind="CONTRACT" branchId={branchId} version={f.version} ownerId={f.ownerId} nextAction={f.nextAction} dueAt={f.dueAt} promisedPaymentDate={f.promisedPaymentDate} cacheKey="admin" loadAssignees={AdminOperationsApi.assignees} onReload={()=>void q.refetch()} onSave={async c=>{await AdminOperationsApi.saveFollowUp(id,c as FollowUpCommand);await client.invalidateQueries(["admin"]);}}/>:<p className="text-xs text-muted-foreground">{f.nextAction||"Следующий шаг не назначен"} · {dateTime(f.dueAt)}</p>}</SectionCard><SectionCard title="История сопровождения"><Timeline events={f.history}/></SectionCard></>:null;
}
