import OperationsReports from "../../../shared/operations/OperationsReports";
import {useDispatcherScope} from "../company/DispatcherScope";
import {OperationsApi} from "./operations.api";
export default function ReportsPage() {const {branchId,ready}=useDispatcherScope();return <OperationsReports branchId={branchId} ready={ready} load={OperationsApi.report} cacheKey="dispatcher"/>;}
