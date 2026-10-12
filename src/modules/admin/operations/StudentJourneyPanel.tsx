import StudentHistoryPanel from "../../dispatcher/operations/StudentHistoryPanel";
import {apiClient} from "../../../shared/api";
import {useAdminBranch} from "../BranchContext";
import {useEmployeeAccess} from "../../../shared/useEmployeeAccess";
import {EmptyState} from "../../../shared/ui";
import type {StudentHistory} from "../../dispatcher/operations/operations.api";
export default function StudentJourneyPanel({id}:{id:string}) {
 const {branchId}=useAdminBranch();const access=useEmployeeAccess();
 if(!["CLIENTS_READ","CRM_READ","CONTRACTS_READ","PAYMENTS_READ","SCHEDULE_READ"].every(access.can))return <EmptyState title="Недостаточно прав для общей истории"/>;
 return branchId?<StudentHistoryPanel id={id} cacheKey={`admin-${branchId}`} root="/admin" load={student=>apiClient.get<StudentHistory>(`/admin/operations/students/${student}?branchId=${branchId}`)}/>:null;
}
