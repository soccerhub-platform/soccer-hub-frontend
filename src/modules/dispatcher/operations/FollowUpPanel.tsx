import {useQuery,useQueryClient} from "@tanstack/react-query";
import {ErrorState,LoadingState} from "../../../shared/ui";
import {getApiErrorMessage} from "../../../shared/api";
import {SectionCard} from "../ui/DispatcherPresentation";
import {OperationsApi,type FollowUpCommand} from "./operations.api";
import {dateTime,OUTCOMES} from "./operations.format";
import {dateLabel} from "../company/company.api";
import Timeline from "./Timeline";
import WorkForm from "./WorkForm";
export default function FollowUpPanel({id,branchId,status}:{id:string;branchId:string;status:string}) {
 const client=useQueryClient();const query=useQuery(["dispatcher","follow-up",id],()=>OperationsApi.followUp(id));const f=query.data;
 return query.isError?<ErrorState message={getApiErrorMessage(query.error)} onRetry={()=>void query.refetch()}/>:query.isLoading?<LoadingState label="Загрузка сопровождения…"/>:f?<><SectionCard title="Сопровождение договора"><p className="mb-3 text-xs text-muted-foreground">Последний контакт: {dateTime(f.lastContactAt)}{f.outcome&&` · ${OUTCOMES[f.outcome]||f.outcome}`}{f.promisedPaymentDate&&` · обещана оплата ${dateLabel(f.promisedPaymentDate)}`}</p>{["DRAFT","CANCELLED"].includes(status)?<p className="text-xs">Сопровождение доступно после активации договора.</p>:<WorkForm key={f.version} kind="CONTRACT" branchId={branchId} version={f.version} ownerId={f.ownerId} nextAction={f.nextAction} dueAt={f.dueAt} promisedPaymentDate={f.promisedPaymentDate} onReload={()=>void query.refetch()} onSave={async c=>{await OperationsApi.saveFollowUp(id,c as FollowUpCommand);await client.invalidateQueries(["dispatcher"]);}}/>}</SectionCard><SectionCard title="История сопровождения"><Timeline events={f.history}/></SectionCard></>:null;
}
