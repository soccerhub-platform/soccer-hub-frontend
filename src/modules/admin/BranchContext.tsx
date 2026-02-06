import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getApiUrl } from "../../shared/api";

type BranchId = string;

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
    const raw = localStorage.getItem(STORAGE_KEY);

    if (raw) {
        const parsed = JSON.parse(raw);
        setBranchId(parsed.branchId);
        setBranchName(parsed.branchName);
    }

    const loadBranchesCount = async () => {
        try {
        const tokenRaw = localStorage.getItem("football-crm:user");
        if (!tokenRaw) return;

        const { accessToken } = JSON.parse(tokenRaw);

        const res = await fetch(getApiUrl("/admin/branches"), {
            headers: { Authorization: `Bearer ${accessToken}` },
        });

        const data = await res.json();
        setBranchesCount(data?.branches?.length ?? 0);
        } catch {
            setBranchesCount(0);
        } finally {
            setIsResolved(true);
        }
    };

    loadBranchesCount();
    }, []);

  const setBranch = (id: string, name: string) => {
    setBranchId(id);
    setBranchName(name);
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ branchId: id, branchName: name })
    );
  };

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
