import {Button} from "../../../shared/ui";
import {paginationClass} from "../ui/DispatcherPresentation";
export default function OperationsPagination({page,total,totalPages,pending,onChange,maxPage=100000,pageSize=25}:{page:number;total:number;totalPages:number;pending:boolean;onChange:(page:number)=>void;maxPage?:number;pageSize?:number}) {
 return <div className={paginationClass}><span>{total?`${page*pageSize+1}–${Math.min((page+1)*pageSize,total)} из ${total}`:"0 записей"}</span><div className="flex items-center gap-3"><Button size="sm" variant="secondary" disabled={!page||pending} onClick={()=>onChange(page-1)}>Назад</Button><span>Страница {page+1} из {Math.max(1,totalPages)}</span><Button size="sm" variant="secondary" disabled={pending||page+1>=totalPages||page>=maxPage} onClick={()=>onChange(page+1)}>Далее</Button></div>{page>=maxPage&&totalPages>maxPage+1&&<p>Для дальнейшего просмотра выберите тип задач.</p>}</div>;
}
