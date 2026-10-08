import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useCallback,
  useState,
} from "react";
import { apiClient } from "../../shared/api";
import { readStoredUser } from "../../shared/auth-storage";

interface BranchContextValue {
  branchId: string | null;
  branchName: string | null;

  setBranch: (id: string, name: string) => void;

  isResolved: boolean;
  canSwitchBranch: boolean;

  setBranchesCount: (count: number) => void;
}

const BranchContext = createContext<BranchContextValue | null>(null);

const STORAGE_KEY = "admin.branch";

export const AdminBranchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [branchId, setBranchId] = useState<string | null>(null);
  const [branchName, setBranchName] = useState<string | null>(null);

  const [branchesCount, setBranchesCount] = useState<number>(0);
  const [isResolved, setIsResolved] = useState(false);

  useEffect(() => {
    const loadBranchesCount = async () => {
        try {
        const user = readStoredUser();
        if (!user?.accessToken) return;
        const data = await apiClient.get<{ branches?: Array<{branchId:string;name:string}> }>("/admin/branches");
        const branches = data?.branches ?? [];
        setBranchesCount(branches.length);
        let saved: {branchId?:string} = {};
        try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { /* Invalid storage must not crash the app. */ }
        const selected = branches.find(b => b.branchId === saved?.branchId) ?? (branches.length === 1 ? branches[0] : null);
        if (selected) {
          setBranchId(selected.branchId); setBranchName(selected.name);
          try { localStorage.setItem(STORAGE_KEY, JSON.stringify({branchId:selected.branchId,branchName:selected.name})); } catch { /* Session selection remains usable. */ }
        } else { setBranchId(null); setBranchName(null); }
        } catch {
            setBranchesCount(0);
        } finally {
            setIsResolved(true);
        }
    };

    loadBranchesCount();
    }, []);

  const setBranch = useCallback((id: string, name: string) => {
    setBranchId(id);
    setBranchName(name);
    try { localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ branchId: id, branchName: name })
    ); } catch { /* The selected branch remains available for this session. */ }
  }, []);

  const value = useMemo(
    () => ({
      branchId,
      branchName,
      setBranch,
      isResolved,
      canSwitchBranch: branchesCount > 1,
      setBranchesCount,
    }),
    [branchId, branchName, isResolved, branchesCount]
  );

  return (
    <BranchContext.Provider value={value}>
      {children}
    </BranchContext.Provider>
  );
};

export function useAdminBranch() {
  const ctx = useContext(BranchContext);
  if (!ctx) {
    throw new Error("useAdminBranch must be used inside AdminBranchProvider");
  }
  return ctx;
}
