import {describe,it,expect} from "vitest";
import {debtPoints,pipelinePoints} from "./DispatcherCharts";
import {presetDates} from "./PeriodFilter";
import {receivedPaymentsPath} from "../company/company.filters";
describe("dispatcher chart data and periods",()=>{
 it("aggregates debt by date without mixing currencies or fabricating missing dates",()=>{
  const rows=[{branchId:"a",date:"2026-10-02",currency:"KZT",count:1,amount:100},{branchId:"b",date:"2026-10-02",currency:"KZT",count:1,amount:200},{branchId:"a",date:"2026-10-01",currency:"USD",count:1,amount:9},{branchId:"a",date:"2026-09-30",currency:"KZT",count:1,amount:50}];
  expect(debtPoints(rows,"KZT")).toEqual([{date:"2026-09-30",value:50},{date:"2026-10-02",value:300}]);
 });
 it("aggregates stages across branches and excludes unrelated metrics",()=>{
  expect(pipelinePoints([{branchId:"a",key:"stage:NEW",count:2},{branchId:"b",key:"stage:NEW",count:3},{branchId:"b",key:"responseMinutes",count:9}],"stage:",()=>"Новые")).toEqual([{name:"Новые",value:5}]);
 });
 it("all time omits dates in payment drilldown",()=>{
  expect(presetDates("ALL","2026-10-11")).toEqual(["",""]);
  const url=new URL(receivedPaymentsPath("",""),"http://test/");expect(url.searchParams.get("period")).toBe("ALL");expect(url.searchParams.has("dateFrom")).toBe(false);
 });
 it("presets cross month/year boundaries correctly",()=>{
  expect(presetDates("WEEK","2026-01-03")).toEqual(["2025-12-28","2026-01-03"]);
  expect(presetDates("MONTH","2024-02-29")).toEqual(["2024-02-01","2024-02-29"]);
  expect(presetDates("YEAR","2026-10-11")).toEqual(["2026-01-01","2026-10-11"]);
 });
});
