import { businessDate, sessionTimestamp } from "../../../shared/business-time";
import { sessionTimeLabel, type WorkspaceSession } from "../sessions.workspace";

export type TimelineEntry = { session: WorkspaceSession; start: number; end: number; lane: number; lanes: number };
const minutes = (value: string) => {
  const [h, m] = sessionTimeLabel(value).split(":").map(Number);
  return h * 60 + m;
};

// Split overnight sessions at the club's midnight, not at the device's midnight.
export function dayEntries(sessions: WorkspaceSession[], day: string): TimelineEntry[] {
  const result = sessions.flatMap(session => {
    const from = businessDate(new Date(sessionTimestamp(session.startsAt)));
    const to = businessDate(new Date(sessionTimestamp(session.endsAt)));
    if (from > day || to < day) return [];
    const start = from === day ? minutes(session.startsAt) : 0;
    const end = to === day ? minutes(session.endsAt) : 1440;
    if (end <= start) return [];
    return [{session, start, end, lane: 0, lanes: 1}];
  }).sort((a,b) => a.start - b.start || a.end - b.end || a.session.id.localeCompare(b.session.id));
  // Short cards also occupy a visual interval. They must not cover their neighbours.
  let cluster: TimelineEntry[] = [], ends: number[] = [], clusterEnd = -1;
  const flush = () => { cluster.forEach(entry => { entry.lanes = ends.length; }); cluster = []; ends = []; };
  for (const entry of result) {
    if (entry.start >= clusterEnd) flush();
    let lane = ends.findIndex(end => end <= entry.start);
    if (lane < 0) lane = ends.length;
    const visualEnd = Math.min(1440, Math.max(entry.end, entry.start + 60));
    ends[lane] = visualEnd;
    entry.lane = lane;
    cluster.push(entry);
    clusterEnd = Math.max(clusterEnd, visualEnd);
  }
  flush();
  return result;
}

export function timelineBounds(entries: TimelineEntry[]) {
  return {
    start: Math.floor(Math.min(8*60, ...entries.map(e=>e.start))/60)*60,
    end: Math.min(1440, Math.ceil(Math.max(22*60, ...entries.map(e=>Math.max(e.end,e.start+60)))/60)*60),
  };
}

export function timelineBlocks(entries: TimelineEntry[]) {
  const blocks: {entries:TimelineEntry[];start:number;end:number}[]=[];
  for(const entry of entries) {
    const last=blocks[blocks.length-1];
    const end=Math.min(1440,Math.max(entry.end,entry.start+60));
    if(last && entry.start<last.end){last.entries.push(entry);last.end=Math.max(last.end,end);}
    else blocks.push({entries:[entry],start:entry.start,end});
  }
  return blocks;
}

export function weekLabel(from: string, to: string) {
  const label = new Intl.DateTimeFormat("ru-RU",{day:"numeric",month:"long",year:"numeric",timeZone:"UTC"});
  return from.slice(0,7) === to.slice(0,7)
    ? `${Number(from.slice(8))} – ${label.format(new Date(`${to}T12:00:00Z`)).replace(/ г\.$/, "")}`
    : `${label.format(new Date(`${from}T12:00:00Z`))} – ${label.format(new Date(`${to}T12:00:00Z`))}`;
}
