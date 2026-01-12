import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { UserGroupIcon } from "@heroicons/react/24/outline";
import { useAuth } from "../../../shared/AuthContext";
import { GroupApi, GroupApiModel } from "./group.api";
import GroupTabs from "./components/GroupTabs";

const GroupDetailsPage: React.FC = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const token = user?.accessToken!;

  const [group, setGroup] = useState<GroupApiModel | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!groupId) return;

    GroupApi.getById(groupId, token)
      .then(setGroup)
      .finally(() => setLoading(false));
  }, [groupId, token]);

  if (loading) {
    return <div className="text-sm text-gray-500">Загрузка…</div>;
  }

  if (!group) {
    return <div className="text-sm text-red-500">Группа не найдена</div>;
  }

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="text-sm text-gray-500 hover:text-gray-700"
      >
        ← Назад к группам
      </button>

      <div className="bg-white rounded-2xl border p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-admin-100 flex items-center justify-center">
            <UserGroupIcon className="h-6 w-6 text-admin-700" />
          </div>

          <div>
            <h1 className="text-xl font-bold">{group.name}</h1>
            <div className="text-sm text-gray-500">
              возраст {group.ageFrom}–{group.ageTo} · уровень {group.level}
            </div>
          </div>
        </div>
      </div>

      <GroupTabs groupId={group.groupId} />
    </div>
  );
};

export default GroupDetailsPage;