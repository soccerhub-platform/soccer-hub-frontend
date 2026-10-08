import React, { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Button, DatePicker, ErrorState, FormField, ModalShell, NativeSelect, TimePicker } from "../../../shared/ui";
import { getApiErrorMessage } from "../../../shared/api";
import { businessDate, sessionTimestamp } from "../../../shared/business-time";
import { GroupApi, type GroupApiModel, type GroupCoachApiModel } from "../groups/group.api";
import { ScheduleApi } from "../groups/schedule/schedule.api";
import type { DayOfWeek, CreateScheduleBatchCommand } from "../groups/schedule/schedule.types";
import { validCalendarDate } from "../sessions.workspace";

export function singleSessionCommand(coachId:string,date:string,start:string,end:string):CreateScheduleBatchCommand {
  const days:DayOfWeek[]=["SUNDAY","MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY"];
  return {coachId,startDate:date,endDate:date,type:"TEMPORARY",slots:[{dayOfWeek:days[new Date(`${date}T12:00:00Z`).getUTCDay()],startTime:start,endTime:end}]};
}

export function AddSessionModal({groups,initialGroup,initialDate,token,onClose,onSaved}: {
  groups:GroupApiModel[];initialGroup:string;initialDate:string;token:string;onClose:()=>void;onSaved:(date:string)=>void;
}) {
  const [group,setGroup]=useState(initialGroup);
  const [date,setDate]=useState(initialDate < businessDate()?businessDate():initialDate);
  const [coach,setCoach]=useState("");
  const [start,setStart]=useState("18:00"),[end,setEnd]=useState("19:00");
  const [coaches,setCoaches]=useState<GroupCoachApiModel[]>([]);
  const [loading,setLoading]=useState(false),[saving,setSaving]=useState(false);
  const [error,setError]=useState<string|null>(null),[coachError,setCoachError]=useState<string|null>(null);
  const [revision,setRevision]=useState(0);
  const busy=useRef(false);
  useEffect(()=>{
    let active=true;setCoach("");setCoaches([]);setCoachError(null);setError(null);
    if(!group){setLoading(false);return;}
    setLoading(true);
    GroupApi.getCoaches(group,token).then(result=>{if(active){setCoaches(result.coaches.filter(c=>c.active));}}).catch(e=>{if(active)setCoachError(getApiErrorMessage(e,"Не удалось загрузить тренеров"));}).finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[group,token,revision]);
  const save=async()=>{
    if(busy.current)return;
    setError(null);
    if(!groups.some(g=>g.groupId===group && g.status==="ACTIVE") || !coaches.some(c=>c.coachId===coach)){setError("Выберите активную группу и её тренера");return;}
    if(!validCalendarDate(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(start) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(end) || end<=start){setError("Укажите дату и время: окончание должно быть позже начала в тот же день");return;}
    if(sessionTimestamp(`${date}T${start}`)<=Date.now()){setError("Новое занятие должно начинаться в будущем (время Алматы)");return;}
    busy.current=true;setSaving(true);
    try {
      const payload=singleSessionCommand(coach,date,start,end);
      const result=await ScheduleApi.validateGroupSchedule(group,payload,token);
      if(!result.valid){setError(result.conflicts.map(c=>c.message || c.code).join(". ") || "Есть конфликт расписания. Выберите другое время.");return;}
      await ScheduleApi.createGroupSchedule(group,payload,token);
      toast.success("Занятие добавлено");onSaved(date);
    }catch(e){setError(getApiErrorMessage(e,"Не удалось добавить занятие"));}finally{busy.current=false;setSaving(false);}
  };
  return <ModalShell title="Добавить занятие" description="Одно занятие на выбранную дату. Повторяющееся расписание группы не изменится." placement="right" maxWidthClassName="max-w-lg" onClose={onClose} closeDisabled={saving}
    footer={<div className="flex justify-end gap-2"><Button variant="secondary" disabled={saving} onClick={onClose}>Отмена</Button><Button disabled={saving || loading || Boolean(coachError)} onClick={save}>{saving?"Проверяем и сохраняем…":"Добавить занятие"}</Button></div>}>
    <fieldset disabled={saving} className="flex min-w-0 flex-col gap-4">
      <FormField label="Группа"><NativeSelect value={group} onChange={e=>setGroup(e.target.value)}><option value="">Выберите группу</option>{groups.filter(g=>g.status==="ACTIVE").map(g=><option key={g.groupId} value={g.groupId}>{g.name}</option>)}</NativeSelect></FormField>
      <FormField label="Тренер"><NativeSelect value={coach} disabled={!group || loading} onChange={e=>{setCoach(e.target.value);setError(null);}}><option value="">{loading?"Загрузка…":"Выберите тренера"}</option>{coaches.map(c=><option key={c.coachId} value={c.coachId}>{c.coachFirstName} {c.coachLastName}</option>)}</NativeSelect></FormField>
      {coachError && <ErrorState message={coachError} onRetry={()=>setRevision(v=>v+1)}/>}
      {group && !loading && !coachError && !coaches.length && <p role="status" className="text-sm">В группе нет активного тренера. Сначала назначьте его в карточке группы.</p>}
      <FormField label="Дата"><DatePicker placeholder="Дата" value={date} onValueChange={value=>{setDate(value);setError(null);}}/></FormField>
      <div className="grid grid-cols-2 gap-3"><FormField label="Начало"><TimePicker aria-label="Начало" value={start} onValueChange={value=>{setStart(value);setError(null);}}/></FormField><FormField label="Окончание"><TimePicker aria-label="Окончание" value={end} onValueChange={value=>{setEnd(value);setError(null);}}/></FormField></div>
      <p className="text-xs text-slate-600">Время Алматы. Создаётся временный период расписания на один день; перед сохранением проверяются конфликты группы и тренера.</p>
      {error && <div role="alert"><ErrorState message={error}/></div>}
    </fieldset>
  </ModalShell>;
}
