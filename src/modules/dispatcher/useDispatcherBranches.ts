import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DispatcherLeadsApi } from "./leads/leads.api";

const STORAGE_KEY = "dispatcher.selectedBranchId";
export const useDispatcherBranches = () => {
  const query = useQuery(["dispatcher", "branches"], DispatcherLeadsApi.listBranches);
  const [selectedBranchId, setBranchId] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) || ""; } catch { return ""; }
  });
  const branches = query.data;
  const selectBranch = (id: string) => {
    setBranchId(id);
    try { localStorage.setItem(STORAGE_KEY,id); } catch { /* Selection remains usable in memory. */ }
  };
  useEffect(() => {
    if (!branches) return;
    if (!branches.some(branch => branch.id === selectedBranchId)) {
      const id = branches[0]?.id || "";
      setBranchId(id);
      try { localStorage.setItem(STORAGE_KEY,id); } catch { /* Storage is optional. */ }
    }
  }, [branches, selectedBranchId]);
  return { branches: branches || [], selectedBranchId, selectBranch, loading: query.isLoading, error: query.error, reload: query.refetch };
};
