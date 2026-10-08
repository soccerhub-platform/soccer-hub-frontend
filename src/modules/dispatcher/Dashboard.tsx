import React from "react";
import { useNavigate } from "react-router-dom";
import AnalyticsDashboard from "../../shared/analytics/AnalyticsDashboard";
import { Button, EmptyState, ErrorState, FormField, LoadingState, NativeSelect, PageHeader, PageShell, SectionCard } from "../../shared/ui";
import { useDispatcherBranches } from "./useDispatcherBranches";

const DispatcherDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { branches, selectedBranchId, selectBranch, loading, error, reload } = useDispatcherBranches();
  const branch = branches.find(value => value.id === selectedBranchId);
  return <PageShell>
    <PageHeader title="Главная" description="Заявки и результаты работы филиалов." actions={<Button onClick={() => navigate('/dispatcher/leads')}>Открыть лиды</Button>} />
    {error ? <ErrorState message="Не удалось загрузить филиалы" onRetry={() => void reload()} /> : loading ? <LoadingState label="Загрузка филиалов…" /> : !branches.length ? <SectionCard><EmptyState title="Начните с клуба и филиала" description="Создайте клуб, добавьте филиал и администратора. Затем можно принимать заявки и смотреть аналитику." action={<Button onClick={() => navigate('/dispatcher/clubs')}>Клубы и филиалы</Button>} /></SectionCard> : <>
      <SectionCard><FormField label="Филиал" className="max-w-sm"><NativeSelect value={selectedBranchId} onChange={e => selectBranch(e.target.value)}>{branches.map(value => <option key={value.id} value={value.id}>{value.name}</option>)}</NativeSelect></FormField></SectionCard>
      {branch && <AnalyticsDashboard scope="dispatcher" branchId={branch.id} title={`Аналитика · ${branch.name}`} />}
    </>}
  </PageShell>;
};
export default DispatcherDashboard;
