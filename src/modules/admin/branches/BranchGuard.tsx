import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAdminBranch } from "../BranchContext";

const BranchGuard: React.FC = () => {
  const { isResolved, branchId } = useAdminBranch();

  // 1️⃣ Ждём, пока context инициализируется
  if (!isResolved) {
    return null; // или loader
  }

  // 2️⃣ Инициализация завершена, но филиал не выбран
  if (!branchId) {
    return <Navigate to="/admin/branch-select" replace />;
  }

  // 3️⃣ Всё ок — пускаем дальше
  return <Outlet />;
};

export default BranchGuard;