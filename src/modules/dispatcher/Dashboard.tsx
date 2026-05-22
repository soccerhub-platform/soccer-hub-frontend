import React, { useEffect, useMemo, useState } from "react";
import { DispatcherLeadsApi } from "./leads/leads.api";
import { DispatcherBranchOption } from "./leads/types";
import AnalyticsDashboard from "../../shared/analytics/AnalyticsDashboard";
import {
  ErrorState,
  LoadingState,
  PageHeader,
  PageShell,
} from "../../shared/ui";

const DispatcherDashboard: React.FC = () => {
  const [branches, setBranches] = useState<DispatcherBranchOption[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const loadBranches = async () => {
      setLoading(true);
      try {
        const data = await DispatcherLeadsApi.listBranches();
        if (!mounted) return;
        setBranches(data);
        if (data.length > 0) {
          setSelectedBranchId((prev) => prev || data[0].id);
        }
      } catch {
        if (!mounted) return;
        setError("Не удалось загрузить филиалы");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadBranches();
    return () => {
      mounted = false;
    };
  }, []);

  const selectedBranchName = useMemo(() => {
    return branches.find((branch) => branch.id === selectedBranchId)?.name;
  }, [branches, selectedBranchId]);

  return (
    <PageShell>
      <PageHeader
        title="Операционная аналитика диспетчера"
        description="Контроль заявок, филиалов и скорости обработки лидов по выбранному филиалу."
        actions={
          <select
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            className="min-w-[220px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-cyan-700 focus:ring-4 focus:ring-cyan-100"
          >
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        }
      />

      {error && <ErrorState message={error} />}

      {loading ? (
        <LoadingState label="Загрузка филиалов..." />
      ) : (
        <AnalyticsDashboard
          scope="dispatcher"
          branchId={selectedBranchId || null}
          title={selectedBranchName ? `Аналитика филиала ${selectedBranchName}` : "Операционная аналитика"}
        />
      )}
    </PageShell>
  );
};

export default DispatcherDashboard;
