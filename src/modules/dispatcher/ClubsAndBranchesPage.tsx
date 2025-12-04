import React, { useEffect, useState } from "react";
import { useAuth } from "../../shared/AuthContext";
import {
  BuildingOffice2Icon,
  PlusIcon,
  MapPinIcon,
  PhoneIcon,
  EnvelopeIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";
import { apiRequest } from "../../shared/api";
import toast from "react-hot-toast";
import LoaderButton from "../../shared/LoaderButton";

interface ClubView {
  id: string;
  name: string;
  slug: string;
  email?: string;
  phone?: string;
  address?: string;
}

interface BranchView {
  id: string;
  clubId: string;
  name: string;
  address?: string;
}

const ClubsAndBranchesPage: React.FC = () => {
  const { user } = useAuth();

  const [clubs, setClubs] = useState<ClubView[]>([]);
  const [branches, setBranches] = useState<BranchView[]>([]);

  const [loadingClubs, setLoadingClubs] = useState(false);
  const [loadingBranches, setLoadingBranches] = useState(false);

  const [expandedClubId, setExpandedClubId] = useState<string | null>(null);

  // модалки
  const [showCreateClubModal, setShowCreateClubModal] = useState(false);
  const [showCreateBranchModal, setShowCreateBranchModal] = useState(false);
  const [branchClubId, setBranchClubId] = useState<string | null>(null);

  // формы
  const [clubForm, setClubForm] = useState({
    name: "",
    slug: "",
    email: "",
    phone: "",
    address: "",
  });

  const [branchForm, setBranchForm] = useState({
    name: "",
    address: "",
  });

  const authHeaders: Record<string, string> = user?.accessToken
    ? { Authorization: `Bearer ${user.accessToken}` }
    : {};

  // ---- Загрузка клубов ----
  const loadClubs = async () => {
    setLoadingClubs(true);
    try {
      const data = await apiRequest("http://localhost:8080/dispatcher/club", {
        headers: { ...authHeaders },
      });

      const apiClubs = data.clubs ?? [];

      setClubs(
        apiClubs.map((c: any) => ({
          id: c.clubId,
          name: c.name,
          slug: c.slug,
          email: c.email,
          phone: c.phoneNumber,
          address: c.address,
        }))
      );
    } finally {
      setLoadingClubs(false);
    }
  };

  // ---- Загрузка филиалов ----
  const loadBranches = async () => {
    setLoadingBranches(true);
    try {
      const data = await apiRequest("http://localhost:8080/dispatcher/branch", {
        headers: { ...authHeaders },
      });

      const apiBranches = data.branches ?? [];

      setBranches(
        apiBranches.map((b: any) => ({
          id: b.branchId,
          clubId: b.clubId,
          name: b.name,
          address: b.address,
        }))
      );
    } finally {
      setLoadingBranches(false);
    }
  };

  // начальная загрузка
  useEffect(() => {
    if (!user?.accessToken) return;
    loadClubs();
    loadBranches();
  }, [user?.accessToken]);

  // ---- Создать клуб ----
  const handleCreateClub = async () => {
    try {
      await apiRequest("http://localhost:8080/dispatcher/club/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify(clubForm),
      });

      toast.success("Клуб успешно создан");
      setShowCreateClubModal(false);
      setClubForm({ name: "", slug: "", email: "", phone: "", address: "" });

      loadClubs();
    } catch {
      // ошибки уже показываются через apiRequest/toast, если так настроено
    }
  };

  // ---- Создать филиал ----
  const handleCreateBranch = async () => {
    if (!branchClubId) return;

    try {
      await apiRequest("http://localhost:8080/dispatcher/branch/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({
          clubId: branchClubId,
          ...branchForm,
        }),
      });

      toast.success("Филиал создан");

      setShowCreateBranchModal(false);
      setBranchForm({ name: "", address: "" });

      loadBranches();
    } catch {}
  };

  // ---- Удалить клуб ----
  const deleteClub = async (clubId: string) => {
    if (!confirm("Удалить клуб?")) return;

    try {
      await apiRequest(`http://localhost:8080/dispatcher/club/${clubId}`, {
        method: "DELETE",
        headers: { ...authHeaders },
      });

      toast.success("Клуб удалён");
      setExpandedClubId((prev) => (prev === clubId ? null : prev));
      loadClubs();
      loadBranches();
    } catch {}
  };

  // ---- Удалить филиал ----
  const deleteBranch = async (branchId: string) => {
    if (!confirm("Удалить филиал?")) return;

    try {
      await apiRequest(`http://localhost:8080/dispatcher/branch/${branchId}`, {
        method: "DELETE",
        headers: { ...authHeaders },
      });

      toast.success("Филиал удалён");
      loadBranches();
    } catch {}
  };

  // ---- Раскрытие строки клуба ----
  const toggleClubExpand = (clubId: string) =>
    setExpandedClubId((prev) => (prev === clubId ? null : clubId));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-dispatcher-700">
            Клубы и филиалы
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Управляйте клубами и их филиалами в едином интерфейсе.
          </p>
        </div>
        <button
          onClick={() => setShowCreateClubModal(true)}
          className="inline-flex items-center px-4 py-2 bg-dispatcher-500 text-white rounded-xl shadow-sm hover:bg-dispatcher-700 transition-colors"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Создать клуб
        </button>
      </div>

      {/* Main Table */}
      <div className="bg-white shadow rounded-2xl p-4 md:p-5">
        {loadingClubs ? (
          <div className="text-sm text-gray-500">Загрузка клубов...</div>
        ) : clubs.length === 0 ? (
          <div className="text-sm text-gray-500">
            Клубов пока нет. Создайте первый клуб.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Клуб
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Контакты
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Адрес
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Филиалы
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {clubs.map((club) => {
                  const clubBranches = branches.filter(
                    (b) => b.clubId === club.id
                  );
                  const isExpanded = expandedClubId === club.id;

                  return (
                    <React.Fragment key={club.id}>
                      {/* Основная строка клуба */}
                      <tr
                        className="hover:bg-dispatcher-50 cursor-pointer transition-colors"
                        onClick={() => toggleClubExpand(club.id)}
                      >
                        {/* Клуб + slug */}
                        <td className="px-4 py-3 text-sm">
                          <div className="flex items-center gap-3">
                            <div className="hidden sm:flex h-9 w-9 rounded-full bg-dispatcher-100 items-center justify-center">
                              <BuildingOffice2Icon className="h-5 w-5 text-dispatcher-700" />
                            </div>
                            <div>
                              <div className="font-semibold text-gray-800">
                                {club.name}
                              </div>
                              <div className="text-xs text-gray-400">
                                slug: {club.slug}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Контакты */}
                        <td className="px-4 py-3 text-sm">
                          <div className="flex flex-col text-xs text-gray-600 space-y-0.5">
                            {club.phone && (
                              <span className="flex items-center">
                                <PhoneIcon className="h-4 w-4 mr-1 text-gray-400" />
                                {club.phone}
                              </span>
                            )}
                            {club.email && (
                              <span className="flex items-center">
                                <EnvelopeIcon className="h-4 w-4 mr-1 text-gray-400" />
                                {club.email}
                              </span>
                            )}
                            {!club.phone && !club.email && (
                              <span className="text-gray-400">
                                Контакты не указаны
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Адрес */}
                        <td className="px-4 py-3 text-sm">
                          {club.address ? (
                            <div className="flex items-center text-xs text-gray-600">
                              <MapPinIcon className="h-4 w-4 mr-1 text-gray-400" />
                              <span className="truncate">{club.address}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">
                              Не указан
                            </span>
                          )}
                        </td>

                        {/* Кол-во филиалов */}
                        <td className="px-4 py-3 text-sm">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">
                            {clubBranches.length}{" "}
                            <span className="ml-1 hidden sm:inline">
                              филиал(ов)
                            </span>
                          </span>
                        </td>

                        {/* Actions */}
                        <td
                          className="px-4 py-3 text-sm text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setBranchClubId(club.id);
                                setShowCreateBranchModal(true);
                              }}
                              className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-dispatcher-100 text-dispatcher-700 hover:bg-dispatcher-200"
                            >
                              <PlusIcon className="h-4 w-4 mr-1" />
                              Филиал
                            </button>

                            <button
                              onClick={() => deleteClub(club.id)}
                              className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100"
                            >
                              ✕ Удалить
                            </button>

                            <button
                              onClick={() => toggleClubExpand(club.id)}
                              className="p-1.5 rounded-full hover:bg-gray-100"
                            >
                              <ChevronDownIcon
                                className={`h-5 w-5 text-gray-400 transition-transform ${
                                  isExpanded ? "rotate-180" : ""
                                }`}
                              />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Вложенный блок с филиалами */}
                      {isExpanded && (
                        <tr className="bg-gray-50/60">
                          <td
                            className="px-4 pb-4 pt-1 text-sm text-gray-700"
                            colSpan={5}
                          >
                            <div className="mt-2 rounded-xl border border-gray-200 bg-white p-3 space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-semibold text-gray-800">
                                  Филиалы клуба "{club.name}"
                                </span>
                                <button
                                  onClick={() => {
                                    setBranchClubId(club.id);
                                    setShowCreateBranchModal(true);
                                  }}
                                  className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-dispatcher-500 text-white hover:bg-dispatcher-700"
                                >
                                  <PlusIcon className="h-4 w-4 mr-1" />
                                  Добавить филиал
                                </button>
                              </div>

                              {loadingBranches ? (
                                <div className="text-xs text-gray-500">
                                  Загрузка филиалов...
                                </div>
                              ) : clubBranches.length === 0 ? (
                                <div className="text-xs text-gray-500">
                                  У этого клуба пока нет филиалов.
                                </div>
                              ) : (
                                <div className="overflow-x-auto">
                                  <table className="min-w-full text-xs">
                                    <thead>
                                      <tr className="border-b border-gray-200 bg-gray-50">
                                        <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">
                                          Название
                                        </th>
                                        <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">
                                          Адрес
                                        </th>
                                        <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">
                                          Действия
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {clubBranches.map((b) => (
                                        <tr
                                          key={b.id}
                                          className="border-b border-gray-100 hover:bg-gray-50"
                                        >
                                          <td className="px-3 py-2 font-medium text-gray-800">
                                            {b.name}
                                          </td>
                                          <td className="px-3 py-2 text-gray-600">
                                            {b.address ? (
                                              <div className="flex items-center">
                                                <MapPinIcon className="h-3 w-3 mr-1 text-gray-400" />
                                                <span className="truncate">
                                                  {b.address}
                                                </span>
                                              </div>
                                            ) : (
                                              <span className="text-gray-400">
                                                Не указан
                                              </span>
                                            )}
                                          </td>
                                          <td className="px-3 py-2 text-right">
                                            <button
                                              onClick={() => deleteBranch(b.id)}
                                              className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100"
                                            >
                                              ✕ Удалить
                                            </button>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ----- MODAL: CREATE CLUB ----- */}
      {showCreateClubModal && (
        <ModalWrapper onClose={() => setShowCreateClubModal(false)}>
          <CreateClubModal
            form={clubForm}
            setForm={setClubForm}
            onSave={handleCreateClub}
            onClose={() => setShowCreateClubModal(false)}
          />
        </ModalWrapper>
      )}

      {/* ----- MODAL: CREATE BRANCH ----- */}
      {showCreateBranchModal && branchClubId && (
        <ModalWrapper onClose={() => setShowCreateBranchModal(false)}>
          <CreateBranchModal
            form={branchForm}
            setForm={setBranchForm}
            onSave={handleCreateBranch}
            onClose={() => setShowCreateBranchModal(false)}
          />
        </ModalWrapper>
      )}
    </div>
  );
};

/* ----------- МОДАЛКИ И ОБЕРТКА ----------- */

const ModalWrapper = ({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 md:p-7 animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
};

const CreateClubModal = ({
  form,
  setForm,
  onSave,
  onClose,
}: {
  form: any;
  setForm: (f: any) => void;
  onSave: () => void;
  onClose: () => void;
}) => (
  <>
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-semibold text-dispatcher-700">
        Создать клуб
      </h3>
      <button
        onClick={onClose}
        className="text-gray-400 hover:text-gray-600 text-xl"
      >
        ✕
      </button>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {[
        ["name", "Название*"],
        ["slug", "Slug*"],
        ["email", "Email"],
        ["phone", "Телефон"],
      ].map(([key, label]) => (
        <div key={key} className="space-y-1">
          <span className="block text-xs font-medium text-gray-600">
            {label}
          </span>
          <input
            type="text"
            className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-dispatcher-500 focus:border-dispatcher-500"
            value={form[key]}
            onChange={(e) => setForm({ ...form, [key]: e.target.value })}
          />
        </div>
      ))}

      <div className="space-y-1 md:col-span-2">
        <span className="block text-xs font-medium text-gray-600">Адрес</span>
        <input
          type="text"
          className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-dispatcher-500 focus:border-dispatcher-500"
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
        />
      </div>
    </div>

    <div className="flex justify-end space-x-2 pt-5">
      <button
        onClick={onClose}
        className="px-4 py-2 text-sm border border-gray-300 rounded-xl hover:bg-gray-50"
      >
        Отмена
      </button>
      <LoaderButton
        onClick={onSave}
        className="px-4 py-2 text-sm bg-dispatcher-500 text-white rounded-xl hover:bg-dispatcher-700"
      >
        Создать
      </LoaderButton>
    </div>
  </>
);

const CreateBranchModal = ({
  form,
  setForm,
  onSave,
  onClose,
}: {
  form: any;
  setForm: (f: any) => void;
  onSave: () => void;
  onClose: () => void;
}) => (
  <>
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-semibold text-dispatcher-700">
        Создать филиал
      </h3>
      <button
        onClick={onClose}
        className="text-gray-400 hover:text-gray-600 text-xl"
      >
        ✕
      </button>
    </div>

    <div className="space-y-3">
      <div className="space-y-1">
        <span className="block text-xs font-medium text-gray-600">
          Название*
        </span>
        <input
          type="text"
          className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-dispatcher-500 focus:border-dispatcher-500"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
      </div>

      <div className="space-y-1">
        <span className="block text-xs font-medium text-gray-600">Адрес</span>
        <input
          type="text"
          className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-dispatcher-500 focus:border-dispatcher-500"
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
        />
      </div>
    </div>

    <div className="flex justify-end space-x-2 pt-5">
      <button
        onClick={onClose}
        className="px-4 py-2 text-sm border border-gray-300 rounded-xl hover:bg-gray-50"
      >
        Отмена
      </button>

      <LoaderButton
        onClick={onSave}
        className="px-4 py-2 text-sm bg-dispatcher-500 text-white rounded-xl hover:bg-dispatcher-700"
      >
        Создать
      </LoaderButton>
    </div>
  </>
);

export default ClubsAndBranchesPage;