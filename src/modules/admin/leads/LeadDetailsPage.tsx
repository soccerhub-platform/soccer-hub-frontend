import React from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../../shared/AuthContext";
import { EmptyState, ErrorState, PageShell } from "../../../shared/ui";
import { useAdminBranch } from "../BranchContext";
import LeadDrawer from "./LeadDrawer";
import { LeadAction } from "./types";

const LeadDetailsPage: React.FC = () => {
  const { leadId } = useParams<{ leadId: string }>();
  const { user } = useAuth();
  const { branchId } = useAdminBranch();
  const navigate = useNavigate();
  const location = useLocation();
  const requestedReturn = (location.state as { returnTo?: string } | null)?.returnTo;
  const returnTo = requestedReturn?.startsWith("/admin/leads?") ? requestedReturn : "/admin/leads";
  const initialAction = (location.state as { initialAction?: LeadAction } | null)?.initialAction ?? null;

  if (!user?.accessToken) return <ErrorState message="Нет авторизации" />;
  if (!branchId) return <EmptyState title="Сначала выберите филиал" description="Детализация лида доступна после выбора рабочего филиала." />;
  if (!leadId) return <ErrorState message="Лид не найден" />;

  return (
    <PageShell className="min-w-0 max-w-[1180px]">
      <LeadDrawer
        embedded
        leadId={leadId}
        isOpen
        branchId={branchId}
        token={user.accessToken}
        initialAction={initialAction}
        onInitialActionHandled={() => navigate(location.pathname, { replace: true, state: { returnTo } })}
        onClose={() => navigate(returnTo)}
        onUpdated={() => undefined}
      />
    </PageShell>
  );
};

export default LeadDetailsPage;
