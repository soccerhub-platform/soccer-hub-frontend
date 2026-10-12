import {useQuery} from "@tanstack/react-query";
import {ModalShell,ErrorState,LoadingState} from "../../../shared/ui";
import {SectionCard} from "../ui/DispatcherPresentation";
import {OperationsApi} from "./operations.api";
import {money,dateLabel} from "../company/company.api";
import FollowUpPanel from "./FollowUpPanel";
import {getApiErrorMessage} from "../../../shared/api";
export default function ContractWorkspace({id,onClose}:{id:string;onClose:()=>void}) {
 const q=useQuery(["dispatcher","contract-record",id],()=>OperationsApi.contract(id));const c=q.data;
 return <ModalShell title={c?.reference||"Сопровождение договора"} description="План, контакт и обещанная оплата" placement="right" maxWidthClassName="max-w-xl" onClose={onClose}>{q.isError?<ErrorState message={getApiErrorMessage(q.error)} onRetry={()=>void q.refetch()}/>:q.isLoading?<LoadingState label="Загрузка договора…"/>:c&&<div className="flex flex-col gap-4"><SectionCard title="Договор"><p>{c.name} · {c.contact}</p><p className="mt-2 text-xs">{c.phone}</p><p className="mt-2 text-xs">{dateLabel(c.startDate)} — {dateLabel(c.endDate)} · {money(c.amount,c.currency)}</p></SectionCard><FollowUpPanel id={id} branchId={c.branchId} status={c.status}/></div>}</ModalShell>;
}
