import React, { useEffect, useState } from "react";
import { ErrorState, LoadingState, ModalShell } from "../../../shared/ui";
import { AdminSessionApi, type AdminSessionDetailsOutput } from "../groups/session.api";
import { CancelSessionModal, RescheduleSessionModal, SubstituteCoachModal } from "../groups/SessionDetailsPage";
import type { SessionAction } from "./SessionCalendar";
import { getApiErrorMessage } from "../../../shared/api";

export function SessionActionDialog({sessionId, action, token, branchId, onClose, onSaved}: {
  sessionId:string; action:SessionAction; token:string; branchId:string|null; onClose:()=>void; onSaved:()=>void;
}) {
  const [session,setSession] = useState<AdminSessionDetailsOutput|null>(null);
  const [error,setError] = useState<string|null>(null);
  const [revision,setRevision] = useState(0);
  useEffect(()=>{
    let active=true; setSession(null); setError(null);
    AdminSessionApi.getDetails(sessionId,token).then(result=>{if(active)setSession(result);}).catch(e=>{if(active)setError(getApiErrorMessage(e,"Не удалось проверить занятие"));});
    return()=>{active=false;};
  },[sessionId,token,revision]);
  const allowed = session && ({cancel:session.capabilities.canCancel,reschedule:session.capabilities.canReschedule,substitute:session.capabilities.canSubstituteCoach}[action]);
  if (!session || !allowed) return <ModalShell title="Проверка занятия" onClose={onClose} placement="right">{error || session ? <ErrorState message={error || "Статус занятия изменился. Это действие больше недоступно."} onRetry={()=>setRevision(v=>v+1)}/> : <LoadingState label="Проверяем актуальный статус…"/>}</ModalShell>;
  if(action==="cancel") return <CancelSessionModal sessionId={session.id} token={token} onClose={onClose} onSaved={onSaved}/>;
  if(action==="reschedule") return <RescheduleSessionModal session={session} token={token} onClose={onClose} onSaved={onSaved}/>;
  return <SubstituteCoachModal session={session} branchId={branchId} token={token} onClose={onClose} onSaved={onSaved}/>;
}
