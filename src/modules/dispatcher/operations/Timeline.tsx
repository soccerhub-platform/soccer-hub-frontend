import { dateTime } from "./operations.format";
import type { TimelineEvent } from "./operations.api";
export default function Timeline({events}:{events:TimelineEvent[]}) {
 return events.length?<ol className="divide-y divide-border">{events.map((e,i)=><li key={e.id||i} className="py-3"><p className="whitespace-pre-wrap break-words text-xs leading-5">{e.description}</p><p className="mt-1 text-[11px] text-muted-foreground">{dateTime(e.occurredAt)}</p></li>)}</ol>:<p className="text-xs text-muted-foreground">Событий пока нет.</p>;
}
