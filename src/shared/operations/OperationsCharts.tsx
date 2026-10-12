import {useId} from "react";
import {BarChart} from "@mui/x-charts/BarChart";
import {PieChart} from "@mui/x-charts/PieChart";
import {LineChart} from "@mui/x-charts/LineChart";
import {ThemeProvider,createTheme} from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import {EmptyState} from "../ui";
import {SectionCard} from "./WorkspacePresentation";
import type {CompanySummary,CompanyMetric} from "../../modules/dispatcher/company/company.api";
import {money,dateLabel} from "../../modules/dispatcher/company/company.api";
import {metricCount} from "../../modules/dispatcher/company/company.metrics";
import {leadStatusLabel} from "../../modules/dispatcher/leads/lead.status";
import type {OperationsReport} from "../../modules/dispatcher/operations/operations.api";
export const chartColors=["#2563eb","#8b5cf6","#06b6d4","#f59e0b","#ec4899","#10b981"];
const number=(n:number)=>new Intl.NumberFormat("ru-RU",{notation:"compact",maximumFractionDigits:1}).format(n);
const chartTheme=createTheme({typography:{fontFamily:"Inter, system-ui, sans-serif",fontSize:12},palette:{primary:{main:chartColors[0]}},components:{MuiPaper:{styleOverrides:{root:{backgroundColor:"var(--background)",color:"var(--foreground)",border:"1px solid var(--border)",borderRadius:12,boxShadow:"0 12px 32px rgb(0 0 0 / .12)"}}}}});
const chartStyle={
 "& .MuiChartsAxis-tickLabel":{fill:"var(--muted-foreground)",fontSize:11},
 "& .MuiChartsAxis-line, & .MuiChartsAxis-tick":{stroke:"var(--border)"},
 "& .MuiChartsGrid-line":{stroke:"var(--border)",strokeDasharray:"3 5"},
 "& .MuiLineChart-line":{strokeWidth:3},
 "& .MuiChartsAxisHighlight-root":{fill:"var(--muted)",opacity:.5},
};
type Point={name:string;value:number};
export function BreakdownChart({title,description,data,currency,donut=false,horizontal=false,unit="заявок"}:{title:string;description:string;data:Point[];currency?:string;donut?:boolean;horizontal?:boolean;unit?:string}) {
 const total=data.reduce((sum,p)=>sum+p.value,0);const reducedMotion=useMediaQuery("(prefers-reduced-motion: reduce)");const gradientId=useId().replace(/:/g,"");const color=currency?chartColors[1]:chartColors[0];
 const format=(value:number|null)=>value==null?"—":currency?money(value,currency):new Intl.NumberFormat("ru-RU").format(value);
 const labels=data.map(p=>p.name);const shortLabel=(value:string)=>value.length>16?`${value.slice(0,15)}…`:value;
 return <SectionCard title={title} description={description}>{!data.length||!total?<EmptyState title="Нет данных за выбранный период"/>:<>
 <div className="flex items-baseline gap-2 pb-2"><span className="text-2xl font-semibold tracking-tight tabular-nums">{format(total)}</span><span className="text-xs text-muted-foreground">{currency?"поступило":donut?"потерь":unit}{!donut&&data.length>1?` · ${data.length} категорий`:""}</span></div>
 <ThemeProvider theme={chartTheme}><div className="relative min-w-0" role="img" aria-label={`${title}: ${data.map(p=>`${p.name} — ${format(p.value)}`).join(", ")}`}>
 {donut?<><PieChart height={260} margin={{top:10,bottom:10,left:10,right:10}} colors={chartColors} hideLegend skipAnimation={reducedMotion} series={[{data:data.map((p,i)=>({id:i,label:p.name,value:p.value})),innerRadius:74,outerRadius:112,paddingAngle:3,cornerRadius:6,highlightScope:{fade:"global",highlight:"item"},valueFormatter:item=>`${format(item.value)} · ${Math.round(item.value/total*100)}%`}]} sx={chartStyle}/><div aria-hidden="true" className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><span className="text-3xl font-semibold tabular-nums">{number(total)}</span><span className="mt-1 text-xs text-muted-foreground">всего потерь</span></div></>:<BarChart height={horizontal?Math.max(210,Math.min(440,data.length*40+55)):260} layout={horizontal?"horizontal":"vertical"} borderRadius={6} grid={horizontal?{vertical:true}:{horizontal:true}} hideLegend skipAnimation={reducedMotion}
 xAxis={horizontal?[{min:0,valueFormatter:(v:number)=>number(v),disableLine:true,disableTicks:true}]:[{scaleType:"band",data:labels,valueFormatter:shortLabel,categoryGapRatio:data.length===1?.75:.5,disableLine:true,disableTicks:true,height:40}]}
 yAxis={horizontal?[{scaleType:"band",data:labels,valueFormatter:shortLabel,width:112,disableLine:true,disableTicks:true}]:[{min:0,valueFormatter:(v:number)=>number(v),width:52,disableLine:true,disableTicks:true}]}
 series={[{data:data.map(p=>p.value),color,label:currency?"Поступления":unit,valueFormatter:format}]} margin={{top:16,bottom:8,left:0,right:12}}
 sx={{...chartStyle,"& .MuiBarChart-element":{fill:`url(#${gradientId})`}}}><defs><linearGradient id={gradientId} x1="0" y1="0" x2={horizontal?"1":"0"} y2={horizontal?"0":"1"}><stop offset="0%" stopColor={currency?"#c4b5fd":"#60a5fa"}/><stop offset="100%" stopColor={color}/></linearGradient></defs></BarChart>}
 </div></ThemeProvider>
 <div className="grid gap-2 border-t border-border pt-3 sm:grid-cols-2">{data.map((p,i)=><div key={`${p.name}-${i}`} className="flex min-w-0 items-center gap-2 text-xs"><span className="size-2 shrink-0 rounded-full" style={{background:donut?chartColors[i%chartColors.length]:color}}/><span className="min-w-0 flex-1 truncate text-muted-foreground" title={p.name}>{p.name}</span><span className="shrink-0 font-medium tabular-nums">{format(p.value)}{donut&&<span className="ml-2 text-muted-foreground">{Math.round(p.value/total*100)}%</span>}</span></div>)}</div>
 </>}</SectionCard>;
}
export function BranchCharts({summary}:{summary:CompanySummary}) {
 const leadData=summary.branches.map(b=>({name:b.name,value:metricCount(summary.metrics.filter(m=>m.branchId===b.id),"newLeads")})).sort((a,b)=>b.value-a.value).slice(0,8);
 const currencies=Array.from(new Set(summary.metrics.filter(m=>m.key==="receipts").map(m=>m.currency||"")));
 return <div className="grid min-w-0 gap-4 xl:grid-cols-2"><BreakdownChart title="Заявки по филиалам" description="До 8 филиалов с наибольшим числом заявок за период." data={leadData}/>{currencies.length?currencies.map(currency=><BreakdownChart key={currency} title={`Поступления · ${currency||"валюта не указана"}`} description="Полученные оплаты за период. Валюты учитываются отдельно." currency={currency} data={summary.branches.map(b=>({name:b.name,value:summary.metrics.filter(m=>m.branchId===b.id&&m.key==="receipts"&&(m.currency||"")===currency).reduce((sum,m)=>sum+Number(m.amount||0),0)})).sort((a,b)=>b.value-a.value).slice(0,8)}/>):<BreakdownChart title="Поступления по филиалам" description="Полученные оплаты за выбранный период." data={[]}/>}</div>;
}
export function pipelinePoints(metrics:CompanyMetric[],prefix:string,label:(key:string)=>string):Point[] {
 return Array.from(new Set(metrics.filter(m=>m.key.startsWith(prefix)).map(m=>m.key))).map(key=>({name:label(key.slice(prefix.length)),value:metricCount(metrics,key)})).sort((a,b)=>b.value-a.value);
}
export function PipelineCharts({report}:{report:OperationsReport}) {
 return <div className="grid min-w-0 gap-4 xl:grid-cols-2"><BreakdownChart title="Этапы заявок" description="Текущий статус заявок, созданных за выбранный период." horizontal data={pipelinePoints(report.pipeline,"stage:",leadStatusLabel)}/><BreakdownChart title="Почему теряем заявки" description="Причины закрытия за выбранный период." donut data={pipelinePoints(report.pipeline,"loss:",key=>report.lossReasonNames?.[key]||key)}/></div>;
}
export function debtPoints(rows:OperationsReport["debtTrend"],currency:string) {
 const dates=new Map<string,number>();rows.filter(r=>r.currency===currency).forEach(r=>dates.set(r.date,(dates.get(r.date)||0)+Number(r.amount)));
 return Array.from(dates,([date,value])=>({date,value})).sort((a,b)=>a.date.localeCompare(b.date));
}
export function DebtCharts({report}:{report:OperationsReport}) {
 const reducedMotion=useMediaQuery("(prefers-reduced-motion: reduce)");const id=useId().replace(/:/g,"");const currencies=Array.from(new Set(report.debtTrend.map(r=>r.currency)));
 return <div className="grid min-w-0 gap-4 xl:grid-cols-2">{currencies.map((currency,i)=>{const data=debtPoints(report.debtTrend,currency);const color=chartColors[i%chartColors.length];return <SectionCard key={currency} title={`Задолженность · ${currency}`} description="Сумма сохранённых снимков выбранных филиалов. Даты без снимков не восстанавливаются.">
 <div className="flex flex-wrap items-baseline justify-between gap-2 pb-2"><span className="text-2xl font-semibold tracking-tight tabular-nums">{money(data.at(-1)?.value,currency)}</span><span className="text-xs text-muted-foreground">Последний снимок · {dateLabel(data.at(-1)?.date)}</span></div>
 <ThemeProvider theme={chartTheme}><div className="min-w-0" role="img" aria-label={`Динамика задолженности в ${currency}, ${data.length} снимков`}><LineChart height={280} hideLegend skipAnimation={reducedMotion} grid={{horizontal:true}} margin={{top:18,bottom:10,left:0,right:16}}
 xAxis={[{scaleType:"time",data:data.map(p=>new Date(`${p.date}T12:00:00Z`)),valueFormatter:(date:Date)=>dateLabel(date.toISOString().slice(0,10)),disableLine:true,disableTicks:true,tickInterval:data.length<=5?data.map(p=>new Date(`${p.date}T12:00:00Z`)):undefined,tickNumber:4,height:38}]}
 yAxis={[{min:0,valueFormatter:(v:number)=>number(v),width:56,disableLine:true,disableTicks:true}]}
 series={[{data:data.map(p=>p.value),label:"Задолженность",color,area:true,curve:"linear",showMark:data.length<20,valueFormatter:(v:number|null)=>v==null?"—":money(v,currency)}]}
 sx={{...chartStyle,"& .MuiLineChart-area":{fill:`url(#${id}-${i})`}}}><defs><linearGradient id={`${id}-${i}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity={.3}/><stop offset="100%" stopColor={color} stopOpacity={.015}/></linearGradient></defs></LineChart></div></ThemeProvider>
 <p className="text-xs text-muted-foreground">{data.length} снимков · точные значения доступны при наведении на график</p>
 </SectionCard>;})}</div>;
}
