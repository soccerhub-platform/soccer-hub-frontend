import {useState} from "react";
import {useQuery,useQueryClient} from "@tanstack/react-query";
import {Button,ErrorState,LoadingState,ModalShell,FormField,NativeSelect,Textarea,StatusBadge} from "../../../shared/ui";
import {getApiErrorMessage} from "../../../shared/api";
import {SectionCard} from "../ui/DispatcherPresentation";
import {useDispatcherScope} from "../company/DispatcherScope";
import {OperationsApi} from "./operations.api";
import {dateTime} from "./operations.format";
import WorkForm from "./WorkForm";
import Timeline from "./Timeline";
import {leadStatusLabel,leadStatusTone} from "../leads/lead.status";
import type {LeadWorkCommand} from "../../admin/leads/types";
function RoutingForm({id,branchId,adminId,version,onSaved}:{id:string;branchId:string;adminId?:string;version:number;onSaved:()=>Promise<void>}) {
 const {branches}=useDispatcherScope();const [target,setTarget]=useState(branchId);const [owner,setOwner]=useState(adminId||"");const [reason,setReason]=useState("");const [error,setError]=useState("");const [saving,setSaving]=useState(false);
 const admins=useQuery(["dispatcher","assignees",target],()=>OperationsApi.assignees(target),{enabled:Boolean(target)});
 const save=async(e:React.FormEvent)=>{e.preventDefault();setSaving(true);setError("");try{await OperationsApi.routeLead(id,{branchId:target,adminId:owner||null,version,reason});await onSaved();}catch(err){setError(getApiErrorMessage(err));}finally{setSaving(false);}};
 return <form className="flex flex-col gap-3" onSubmit={save}><FormField label="Филиал"><NativeSelect value={target} onChange={e=>{setTarget(e.target.value);setOwner("");}}>{branches.filter(b=>b.active||b.branchId===branchId).map(b=><option value={b.branchId} key={b.branchId}>{b.name}</option>)}</NativeSelect></FormField><FormField label="Ответственный">{admins.isError?<ErrorState message="Не удалось загрузить администраторов" onRetry={()=>void admins.refetch()}/>:<NativeSelect value={owner} onChange={e=>setOwner(e.target.value)} disabled={admins.isLoading}><option value="">Не назначен</option>{owner&&!admins.data?.some(a=>a.id===owner)&&<option value={owner}>Текущий ответственный недоступен</option>}{admins.data?.map(a=><option value={a.id} key={a.id}>{a.firstName} {a.lastName}</option>)}</NativeSelect>}</FormField><FormField label="Причина передачи"><Textarea value={reason} required maxLength={1000} rows={2} onChange={e=>setReason(e.target.value)}/></FormField>{error&&<p role="alert" className="text-xs text-destructive">{error}</p>}<Button type="submit" variant="secondary" disabled={saving||admins.isLoading||admins.isError}>{saving?"Сохранение…":"Передать лид"}</Button></form>;
}
export default function LeadWorkspace({id,onClose}:{id:string;onClose:()=>void}) {
 const client=useQueryClient();const query=useQuery(["dispatcher","lead-workspace",id],()=>OperationsApi.lead(id));const history=useQuery(["dispatcher","lead-history",id],()=>OperationsApi.activities(id));
 const reload=async()=>{await client.invalidateQueries(["dispatcher"]);};
 const lead=query.data?.lead;const closed=lead?.status==="LOST"||lead?.status==="CONVERTED";
 return <ModalShell title={lead?.primaryContact.fullName||"Заявка"} description="Распределение, контакт и план работы" placement="right" maxWidthClassName="max-w-xl" onClose={onClose}>
 {query.isError?<ErrorState message={getApiErrorMessage(query.error)} onRetry={()=>void query.refetch()}/>:query.isLoading?<LoadingState label="Загрузка заявки…"/>:lead&&query.data&&<div className="flex flex-col gap-4"><StatusBadge tone={leadStatusTone(lead.status)}>{leadStatusLabel(lead.status)}</StatusBadge><SectionCard title="Контакт и ученики"><p className="text-sm">{lead.primaryContact.phone}</p>{lead.primaryContact.email&&<p className="break-all text-xs">{lead.primaryContact.email}</p>}{lead.participants.map((p,i)=><p className="mt-2 text-xs" key={p.id||i}>{p.fullName}</p>)}{lead.comment&&<p className="mt-3 whitespace-pre-wrap text-xs text-muted-foreground">{lead.comment}</p>}<p className="mt-3 text-xs">Ответственный: {lead.assignedAdmin?.name||"Не назначен"}</p><p className="mt-2 text-xs text-muted-foreground">Последний контакт: {dateTime(lead.work?.lastContactAt)}</p></SectionCard>
 {!closed&&<><SectionCard title="Распределение"><RoutingForm key={`route-${lead.work?.version}`} id={id} branchId={query.data.branchId} adminId={lead.assignedAdmin?.id} version={lead.work?.version||0} onSaved={reload}/></SectionCard><SectionCard title="Контакт и следующий шаг"><WorkForm key={`work-${lead.work?.version}`} kind="LEAD" branchId={query.data.branchId} version={lead.work?.version||0} nextAction={lead.work?.nextAction} dueAt={lead.work?.nextActionAt} priority={lead.work?.priority} onSave={async c=>{await OperationsApi.leadWork(id,c as LeadWorkCommand);await reload();}} onReload={()=>void query.refetch()}/></SectionCard></>}
 <SectionCard title="История заявки">{history.isError?<ErrorState message="Не удалось загрузить историю" onRetry={()=>void history.refetch()}/>:history.isLoading?<LoadingState label="Загрузка…"/>:<Timeline events={(history.data||[]).map(a=>({type:a.type,description:a.description,occurredAt:a.createdAt}))}/>}</SectionCard></div>}
 </ModalShell>;
}
