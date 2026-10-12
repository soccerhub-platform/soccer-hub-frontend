import React, { createContext, useContext, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../shared/api";
import { useAuth } from "../../../shared/AuthContext";
import { Button, NativeSelect } from "../../../shared/ui";
interface Branch { branchId: string; name: string; active: boolean; clubId: string }
interface Scope { branchId: string; setBranchId: (id: string) => void; branches: Branch[]; ready: boolean }
const Context = createContext<Scope | null>(null);
export function DispatcherScopeProvider({children}: React.PropsWithChildren) {
 const { user } = useAuth();
 const key = `dispatcher.companyScope.${user?.email || ""}`;
 const [selection,setSelection] = useState(() => { try { return localStorage.getItem(key) || ""; } catch { return ""; } });
 const query = useQuery(["dispatcher","club-branches"], () => apiClient.get<{branches: Branch[]}>("/dispatcher/branch?includeArchived=true"));
 const branches = query.data?.branches || [];
 const branchId = selection && branches.some(branch => branch.branchId === selection) ? selection : "";
 useEffect(() => { if(query.isSuccess && selection !== branchId) setSelection(branchId); },[query.isSuccess,selection,branchId]);
 const setBranchId = (id: string) => { setSelection(id); try { localStorage.setItem(key,id); } catch { /* Selection remains available for this session. */ } };
 return <Context.Provider value={{branchId,setBranchId,branches,ready:query.isSuccess}}>
  <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-border bg-background px-4 py-3 sm:px-6">
   <label htmlFor="dispatcher-scope" className="text-xs font-medium text-muted-foreground">Область просмотра</label>
   <NativeSelect id="dispatcher-scope" value={branchId} disabled={!query.isSuccess} className="w-full sm:w-72" onChange={e => setBranchId(e.target.value)}>
    <option value="">{query.isLoading ? "Загрузка филиалов…" : "Вся компания"}</option>
    {branches.map(branch => <option key={branch.branchId} value={branch.branchId}>{branch.name}{branch.active ? "" : " · архив"}</option>)}
   </NativeSelect>
   {query.isError && <><span role="alert" className="text-xs text-destructive">Не удалось загрузить филиалы</span><Button variant="secondary" size="sm" onClick={() => void query.refetch()}>Повторить</Button></>}
  </div>
  {children}
 </Context.Provider>;
}
export function useDispatcherScope() { const scope=useContext(Context); if(!scope) throw new Error("Dispatcher scope is missing"); return scope; }
