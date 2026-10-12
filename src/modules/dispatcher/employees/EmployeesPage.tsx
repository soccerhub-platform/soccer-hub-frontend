import React from "react";
import { useSearchParams } from "react-router-dom";
import { ToggleGroup, ToggleGroupItem } from "../../../shared/ui";
import AdminsPage from "../AdminsPage";
import CoachesPage from "./CoachesPage";
export default function EmployeesPage() {
 const [params,setParams]=useSearchParams();const tab=params.get("tab")==="coaches"?"coaches":"admins";
 const categoryTabs=<div className="border-b border-border px-4 pt-2"><ToggleGroup type="single" value={tab} aria-label="Категория сотрудников" onValueChange={value=>{if(value)setParams({tab:value});}} className="h-11 max-w-full justify-start gap-3 overflow-x-auto rounded-none bg-transparent p-0">{[["admins","Администраторы"],["coaches","Тренеры"]].map(([value,label])=><ToggleGroupItem key={value} value={value} className="h-11 shrink-0 rounded-none border-b-2 border-transparent bg-transparent! px-1 text-xs shadow-none! data-[state=on]:border-blue-600 data-[state=on]:text-blue-700!">{label}</ToggleGroupItem>)}</ToggleGroup></div>;
 return tab==="admins"?<AdminsPage categoryTabs={categoryTabs} />:<CoachesPage categoryTabs={categoryTabs} />;
}
