import { describe, expect, it } from "vitest";
import { dayEntries, timelineBlocks, timelineBounds, weekLabel } from "./timeline";
import { filterSessions, type WorkspaceSession } from "../sessions.workspace";
const session=(id:string,start:string,end:string)=>({id,groupId:"g",groupName:"Команда",sessionDate:"2026-09-12",startsAt:`2026-09-12T${start}:00`,endsAt:`2026-09-12T${end}:00`,status:"PLANNED",effectiveStatus:"PLANNED",coaches:[],location:null} as unknown as WorkspaceSession);
describe("calendar timeline",()=>{
  it("places concurrent sessions in separate lanes",()=>{
    const entries=dayEntries([session("a","10:00","11:00"),session("b","10:30","11:30"),session("c","12:00","13:00")],"2026-09-12");
    expect(entries.map(e=>[e.lane,e.lanes])).toEqual([[0,2],[1,2],[0,1]]);
  });
  it("keeps adjacent full-hour sessions in one lane",()=>{
    expect(dayEntries([session("a","10:00","11:00"),session("b","11:00","12:00")],"2026-09-12").map(e=>e.lanes)).toEqual([1,1]);
  });
  it("groups intersections without dropping sessions or merging separate hours",()=>{
    const blocks=timelineBlocks(dayEntries([session("a","10:00","11:00"),session("b","10:30","11:30"),session("c","12:00","13:00")],"2026-09-12"));
    expect(blocks.map(b=>b.entries.map(e=>e.session.id))).toEqual([["a","b"],["c"]]);
  });
  it("short cards do not cover following cards",()=>{
    expect(dayEntries([session("a","10:00","10:15"),session("b","10:20","10:30")],"2026-09-12").map(e=>e.lane)).toEqual([0,1]);
  });
  it("includes early and late sessions in the visible time axis",()=>{
    expect(timelineBounds(dayEntries([session("a","06:30","07:30"),session("b","23:00","23:59")],"2026-09-12"))).toEqual({start:360,end:1440});
  });
  it("uses Almaty offset even when the API returns UTC",()=>{
    const s={...session("a","10:00","11:00"),startsAt:"2026-09-11T21:00:00Z",endsAt:"2026-09-11T22:00:00Z"};
    expect(dayEntries([s],"2026-09-12")[0].start).toBe(120);
    expect(dayEntries([s],"2026-09-11")).toEqual([]);
  });
  it("splits overnight sessions without rendering empty midnight segments",()=>{
    const s={...session("a","23:30","23:59"),endsAt:"2026-09-13T00:30:00"};
    expect(dayEntries([s],"2026-09-12")[0].end).toBe(1440);
    expect(dayEntries([s],"2026-09-13")[0].end).toBe(30);
    expect(dayEntries([{...s,endsAt:"2026-09-13T00:00:00"}],"2026-09-13")).toEqual([]);
  });
  it("combines group, place, date, status and search filters",()=>{
    const a=session("a","10:00","11:00"),b={...a,id:"b",groupId:"other",location:{id:"arena",name:"Арена"}};
    expect(filterSessions([a,b],{status:"ALL",coach:"",query:"команда",group:"g",place:"none",day:"2026-09-12"}).map(s=>s.id)).toEqual(["a"]);
    expect(filterSessions([a,b],{status:"CANCELLED",coach:"",query:""})).toEqual([]);
  });
  it("labels ranges across months and years unambiguously",()=>{
    expect(weekLabel("2026-09-07","2026-09-13")).toContain("7 – 13 сентября 2026");
    expect(weekLabel("2026-12-28","2027-01-03")).toContain("2027");
  });
});
