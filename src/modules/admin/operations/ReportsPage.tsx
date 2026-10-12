import { PageShell, PageHeader, SectionCard, MetricCard, SummaryStrip } from "../AdminPresentation";
import OperationsReports from "../../../shared/operations/OperationsReports";
import {useAdminBranch} from "../BranchContext";
import {AdminOperationsApi} from "./operations.api";
export default function ReportsPage() {const {branchId}=useAdminBranch();return <OperationsReports branchId={branchId||undefined} ready={Boolean(branchId)} cacheKey="admin" presentation={{PageShell,PageHeader,SectionCard,MetricCard,SummaryStrip}} load={AdminOperationsApi.report}/>;}
