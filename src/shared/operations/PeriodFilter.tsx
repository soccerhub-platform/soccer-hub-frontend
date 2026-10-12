import {FormField,Input,NativeSelect} from "../ui";
import {businessDate,addBusinessDays} from "../business-time";
export function presetDates(preset:string,today=businessDate()):[string,string] {
 switch(preset) {
  case "ALL":return ["",""];
  case "TODAY":return [today,today];
  case "WEEK":return [addBusinessDays(today,-6),today];
  case "MONTH":return [`${today.slice(0,7)}-01`,today];
  case "YEAR":return [`${today.slice(0,4)}-01-01`,today];
  default:return [addBusinessDays(today,-29),today];
 }
}
export default function PeriodFilter({from,to,onChange,label="Период",future=false}:{from:string;to:string;onChange:(from:string,to:string)=>void;label?:string;future?:boolean}) {
 const today=businessDate();
 const presets=[["ALL","За всё время"],["TODAY","Сегодня"],["WEEK","Последние 7 дней"],["MONTH","Текущий месяц"],["YEAR","Текущий год"]];
 const value=presets.find(([key])=>{const [a,b]=presetDates(key,today);return a===from&&b===to;})?.[0]||"CUSTOM";
 return <><FormField label={label}><NativeSelect aria-label={label} value={value} onChange={e=>{if(e.target.value!=="CUSTOM")onChange(...presetDates(e.target.value,today));}}>{presets.map(([key,text])=><option key={key} value={key}>{text}</option>)}<option value="CUSTOM">Свой диапазон</option></NativeSelect></FormField><FormField label="С даты"><Input aria-label="С даты" type="date" value={from} max={future?undefined:today} onChange={e=>onChange(e.target.value,to)}/></FormField><FormField label="По дату"><Input aria-label="По дату" type="date" value={to} max={future?undefined:today} onChange={e=>onChange(from,e.target.value)}/></FormField></>;
}
