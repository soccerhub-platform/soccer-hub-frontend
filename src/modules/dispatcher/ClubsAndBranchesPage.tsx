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
          phone: c.phone,
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
    } catch {}
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

  // ---- Раскрытие карточки клуба ----
  const toggleClubExpand = (clubId: string) =>
    setExpandedClubId((prev) => (prev === clubId ? null : clubId));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-dispatcher-700">
          Клубы и филиалы
        </h2>
        <button
          onClick={() => setShowCreateClubModal(true)}
          className="inline-flex items-center px-4 py-2 bg-dispatcher-500 text-white rounded-md hover:bg-dispatcher-700 transition"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Создать клуб
        </button>
      </div>

      {/* Clubs list */}
      <div className="bg-white shadow rounded-lg p-4">
        {loadingClubs ? (
          <div className="text-sm text-gray-500">Загрузка клубов...</div>
        ) : clubs.length === 0 ? (
          <div className="text-sm text-gray-500">Клубов пока нет.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {clubs.map((club) => {
              const clubBranches = branches.filter(
                (b) => b.clubId === club.id
              );
              const isExpanded = expandedClubId === club.id;

              return (
                <div
                  key={club.id}
                  className="border border-gray-200 rounded-lg shadow-sm bg-white flex flex-col"
                >
                  <button
                    onClick={() => toggleClubExpand(club.id)}
                    className="w-full flex items-start justify-between p-4 text-left hover:bg-dispatcher-50 rounded-t-lg transition"
                  >
                    <div className="flex items-start space-x-3">
                      <div className="p-2 bg-dispatcher-100 rounded-full">
                        <BuildingOffice2Icon className="h-6 w-6 text-dispatcher-600" />
                      </div>

                      <div>
                        <div className="text-base font-semibold text-dispatcher-700">
                          {club.name}
                        </div>
                        <div className="text-xs text-gray-400">
                          slug: {club.slug}
                        </div>

                        {club.address && (
                          <div className="flex items-center text-xs text-gray-500 mt-1">
                            <MapPinIcon className="h-4 w-4 mr-1" />
                            {club.address}
                          </div>
                        )}

                        {(club.phone || club.email) && (
                          <div className="flex flex-col text-xs text-gray-500 mt-1 space-y-0.5">
                            {club.phone && (
                              <span className="flex items-center">
                                <PhoneIcon className="h-4 w-4 mr-1" />
                                {club.phone}
                              </span>
                            )}
                            {club.email && (
                              <span className="flex items-center">
                                <EnvelopeIcon className="h-4 w-4 mr-1" />
                                {club.email}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <ChevronDownIcon
                        className={`h-5 w-5 text-gray-400 transition-transform ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                      />

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteClub(club.id);
                        }}
                        className="text-red-500 hover:text-red-700 font-bold"
                      >
                        ✕
                      </button>
                    </div>
                  </button>

                  {/* Expanded */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 px-4 pb-4 pt-2 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-gray-700">
                          Филиалы ({clubBranches.length})
                        </span>

                        <button
                          onClick={() => {
                            setBranchClubId(club.id);
                            setShowCreateBranchModal(true);
                          }}
                          className="inline-flex items-center text-xs px-2 py-1 bg-dispatcher-500 text-white rounded hover:bg-dispatcher-700"
                        >
                          <PlusIcon className="h-4 w-4 mr-1" />
                          Филиал
                        </button>
                      </div>

                      {loadingBranches ? (
                        <div className="text-xs text-gray-500">
                          Загрузка филиалов...
                        </div>
                      ) : clubBranches.length === 0 ? (
                        <div className="text-xs text-gray-500">
                          Нет филиалов.
                        </div>
                      ) : (
                        <ul className="space-y-1">
                          {clubBranches.map((b) => (
                            <li
                              key={b.id}
                              className="flex items-start justify-between text-xs bg-gray-50 rounded px-2 py-1"
                            >
                              <div>
                                <div className="font-semibold text-gray-700">
                                  {b.name}
                                </div>
                                {b.address && (
                                  <div className="flex items-center text-gray-500">
                                    <MapPinIcon className="h-3 w-3 mr-1" />
                                    {b.address}
                                  </div>
                                )}
                              </div>

                              <button
                                onClick={() => deleteBranch(b.id)}
                                className="text-red-500 hover:text-red-700 font-bold ml-2"
                              >
                                ✕
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 animate-slideUp"
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
}: any) => (
  <>
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-semibold text-dispatcher-700">
        Создать клуб
      </h3>
      <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
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
          <label className="text-xs text-gray-600">{label}</label>
          <input
            type="text"
            className="w-full border rounded px-3 py-2 text-sm"
            value={form[key]}
            onChange={(e) => setForm({ ...form, [key]: e.target.value })}
          />
        </div>
      ))}

      {/* Address */}
      <div className="space-y-1 md:col-span-2">
        <label className="text-xs text-gray-600">Адрес</label>
        <input
          type="text"
          className="w-full border rounded px-3 py-2 text-sm"
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
        />
      </div>
    </div>

    <div className="flex justify-end space-x-2 pt-4">
      <button onClick={onClose} className="px-4 py-2 text-sm border rounded-md">
        Отмена
      </button>
      <LoaderButton
        onClick={onSave}
        className="px-4 py-2 bg-dispatcher-500 text-white rounded-md hover:bg-dispatcher-700"
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
}: any) => (
  <>
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-semibold text-dispatcher-700">
        Создать филиал
      </h3>
      <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
        ✕
      </button>
    </div>

    <div className="space-y-3">
      <div className="space-y-1">
        <label className="text-xs text-gray-600">Название*</label>
        <input
          type="text"
          className="w-full border rounded px-3 py-2 text-sm"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs text-gray-600">Адрес</label>
        <input
          type="text"
          className="w-full border rounded px-3 py-2 text-sm"
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
        />
      </div>
    </div>

    <div className="flex justify-end space-x-2 pt-4">
      <button onClick={onClose} className="px-4 py-2 text-sm border rounded-md">
        Отмена
      </button>

      <LoaderButton
        onClick={onSave}
        className="px-4 py-2 bg-dispatcher-500 text-white rounded-md hover:bg-dispatcher-700"
      >
        Создать
      </LoaderButton>
    </div>
  </>
);

export default ClubsAndBranchesPage;