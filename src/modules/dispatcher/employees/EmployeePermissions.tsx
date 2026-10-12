import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { apiClient, getApiErrorMessage } from "../../../shared/api";
import { Button, ErrorState, LoadingState, ModalShell, ToggleGroup, ToggleGroupItem } from "../../../shared/ui";
import { Checkbox } from "../../../shared/ui/shadcn/checkbox";
import { Field, FieldLabel } from "../../../shared/ui/shadcn/field";
export const PERMISSION_SECTIONS = [
 ["CRM","Заявки и лиды"],["CLIENTS","Клиенты и ученики"],["CONTRACTS","Договоры"],["PAYMENTS","Оплаты"],
 ["TEAM","Тренеры"],["SCHEDULE","Группы, занятия и пробные"],["ANALYTICS","Показатели и аналитика"],
 ["COACH_SESSIONS","Занятия, расписание и история"],
] as const;
export default function EmployeePermissions({id,name,role,onClose}: {id:string;name:string;role:"admin"|"coach";onClose:()=>void}) {
 const path=`/dispatcher/${role}/${id}/permissions`;
 const query=useQuery(["dispatcher","employee-permissions",role,id],()=>apiClient.get<{permissions:string[]}>(path));
 const [draft,setDraft]=useState<string[]|null>(null);const [pending,setPending]=useState(false);
 const grants=draft || query.data?.permissions || [];
 const sections=PERMISSION_SECTIONS.filter(([code])=>role==="coach"?code.startsWith("COACH_"):!code.startsWith("COACH_"));
 const allowed=sections.flatMap(([code])=>code==="ANALYTICS"?[`${code}_READ`]:[`${code}_READ`,`${code}_WRITE`]);
 const readOnlyGrants=allowed.filter(p=>p.endsWith("_READ"));
 const preset=allowed.every(p=>grants.includes(p))?"full":grants.length===0?"none":grants.length===readOnlyGrants.length && readOnlyGrants.every(p=>grants.includes(p))?"read":"";
 const toggle=(permission:string,checked:boolean)=>{
  const next=new Set(grants);
  if(checked) {next.add(permission);if(permission.endsWith("_WRITE")) next.add(permission.replace("_WRITE","_READ"));}
  else {next.delete(permission);if(permission.endsWith("_READ")) next.delete(permission.replace("_READ","_WRITE"));}
  setDraft([...next]);
 };
 const save=async()=>{if(pending)return;setPending(true);try {await apiClient.put(path,{permissions:grants});toast.success("Права сотрудника сохранены");await query.refetch();onClose();}catch(error){toast.error(getApiErrorMessage(error,"Не удалось сохранить права"));}finally{setPending(false);}};
 return <ModalShell title="Права доступа" description={`${name} · ${role==="admin"?"Администратор":"Тренер"}`} placement="right" maxWidthClassName="max-w-xl" closeDisabled={pending} onClose={onClose} footer={<div className="flex justify-end gap-2"><Button variant="secondary" disabled={pending} onClick={onClose}>Отмена</Button><Button disabled={!query.isSuccess || pending} onClick={()=>void save()}>{pending?"Сохранение…":"Сохранить права"}</Button></div>}>
  {query.isError?<ErrorState message="Не удалось загрузить права" onRetry={()=>void query.refetch()} />:query.isLoading?<LoadingState label="Загрузка прав…" />:<div className="flex flex-col gap-5"><p className="text-sm text-muted-foreground">Доступ действует только в назначенных филиалах. Изменение прав применяется к следующим запросам сотрудника. Профиль и смена пароля остаются доступны.</p>
   <ToggleGroup type="single" variant="outline" value={preset} aria-label="Набор прав" onValueChange={value=>{if(value) setDraft(value==="full"?allowed:value==="read"?allowed.filter(p=>p.endsWith("_READ")):[]);}}><ToggleGroupItem value="full">Полный доступ</ToggleGroupItem><ToggleGroupItem value="read">Только просмотр</ToggleGroupItem><ToggleGroupItem value="none">Без доступа</ToggleGroupItem></ToggleGroup>
   <div className="flex flex-col divide-y divide-border">{sections.map(([code,label])=><section key={code} className="flex flex-col gap-3 py-4"><h3 className="text-sm font-semibold">{label}</h3>{code==="CRM" && <p className="text-xs text-muted-foreground">Для конверсии заявки дополнительно нужны права изменения клиентов и договоров.</p>}<div className="flex flex-wrap gap-5">{["READ",...(code==="ANALYTICS"?[]:["WRITE"])].map(action=>{const permission=`${code}_${action}`;return <Field key={permission} className="flex-row items-center gap-2"><Checkbox id={permission} checked={grants.includes(permission)} disabled={pending} onCheckedChange={checked=>toggle(permission,checked===true)} /><FieldLabel htmlFor={permission}>{action==="READ"?"Просмотр":code==="COACH_SESSIONS"?"Посещаемость и управление занятиями":"Изменение"}</FieldLabel></Field>;})}</div></section>)}</div>
  </div>}
 </ModalShell>;
}
