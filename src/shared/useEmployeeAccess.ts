import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { apiClient } from "./api";
import { useAuth } from "./AuthContext";
export const ACCESS_LABELS: Record<string,string>={CRM:"Заявки и лиды",CLIENTS:"Клиенты и ученики",CONTRACTS:"Договоры",PAYMENTS:"Оплаты",TEAM:"Тренеры",SCHEDULE:"Группы и занятия",ANALYTICS:"Аналитика",COACH_SESSIONS:"Занятия тренера"};
export function permissionLabel(code:string) {const resource=code.replace(/_(READ|WRITE)$/,"");return `${ACCESS_LABELS[resource] || resource}: ${code.endsWith("_WRITE")?"изменение":"просмотр"}`;}
export function routePermission(path:string) {
 if(path.startsWith("/coach/")) return path.includes("/profile")?undefined:"COACH_SESSIONS";
 const section=path.split("/")[2] || "dashboard";
 return ({dashboard:"ANALYTICS",reports:"ANALYTICS",tasks:"CRM",debts:"PAYMENTS",capacity:"SCHEDULE",leads:"CRM",clients:"CLIENTS",students:"CLIENTS",contracts:"CONTRACTS",payments:"PAYMENTS",coaches:"TEAM",users:"TEAM",schedule:"SCHEDULE",groups:"SCHEDULE",sessions:"SCHEDULE",trials:"SCHEDULE"} as Record<string,string>)[section];
}
export function useEmployeeAccess() {
 const {user}=useAuth();const {pathname}=useLocation();
 const [permissions,setPermissions]=useState<string[]|null>(null);const [error,setError]=useState(false);const [version,setVersion]=useState(0);
 const elevated=Boolean(user?.roles.some(role=>role==="DISPATCHER" || role==="SUPER_ADMIN"));
 const reload=useCallback(()=>setVersion(value=>value+1),[]);
 useEffect(()=>{let active=true;setError(false);void apiClient.get<{permissions:string[]}>("/auth/access").then(data=>{if(active)setPermissions(data.permissions);}).catch(()=>{if(active)setError(true);});return()=>{active=false;};},[user?.email,pathname,version]);
 useEffect(()=>{window.addEventListener("focus",reload);return()=>window.removeEventListener("focus",reload);},[reload]);
 const can=(code:string)=>elevated || Boolean(permissions?.includes(code));
 const canVisit=(path:string)=>{if(path==="/admin/tasks")return ["CRM_READ","CONTRACTS_READ","SCHEDULE_READ"].every(can);if(path==="/admin/reports")return ["ANALYTICS_READ","CRM_READ","CONTRACTS_READ","PAYMENTS_READ","SCHEDULE_READ"].every(can);if(path==="/admin/debts")return ["CONTRACTS_READ","PAYMENTS_READ"].every(can);const resource=routePermission(path);return !resource || can(`${resource}_READ`);};
 const resource=routePermission(pathname);
 return {can,canVisit,canViewCurrent:canVisit(pathname),error,reload,loading:permissions===null && !error,readOnly:resource && resource!=="ANALYTICS" && can(`${resource}_READ`) && !can(`${resource}_WRITE`)};
}
