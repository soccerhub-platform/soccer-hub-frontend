import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  BellIcon,
  CheckCircleIcon,
  ClockIcon,
  IdentificationIcon,
  LockClosedIcon,
  PhoneIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../../../shared/AuthContext";
import { CoachApi, CoachProfileGroup } from "../coach.api";

const inputClassName =
  "w-full rounded-xl border border-teal-100 bg-white px-3 py-2.5 text-sm text-teal-950 outline-none transition focus:border-teal-700 focus:ring-4 focus:ring-teal-100";
const cardClassName =
  "rounded-2xl border border-teal-100 bg-white p-4 shadow-sm shadow-teal-900/5";
const primaryButtonClassName =
  "inline-flex h-11 w-full items-center justify-center rounded-xl bg-teal-950 px-4 text-sm font-semibold text-white transition hover:bg-teal-900 disabled:opacity-60";

const SectionError: React.FC<{ message: string }> = ({ message }) => {
  if (!message) return null;
  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
      {message}
    </div>
  );
};

const userFriendlyError = (error: unknown) => {
  const message = error instanceof Error ? error.message : "";
  switch (message) {
    case "Current password is incorrect":
      return "Текущий пароль указан неверно";
    case "Validation failed":
      return "Проверьте заполнение полей";
    default:
      return message || "Не удалось выполнить действие";
  }
};

const DAYS = [
  { key: "MON", label: "Пн" },
  { key: "TUE", label: "Вт" },
  { key: "WED", label: "Ср" },
  { key: "THU", label: "Чт" },
  { key: "FRI", label: "Пт" },
  { key: "SAT", label: "Сб" },
  { key: "SUN", label: "Вс" },
];

const CoachProfilePage: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sectionErrors, setSectionErrors] = useState({
    profile: "",
    availability: "",
    notifications: "",
    password: "",
  });
  const [status, setStatus] = useState("ACTIVE");
  const [groups, setGroups] = useState<CoachProfileGroup[]>([]);
  const [profile, setProfile] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: user?.email ?? "coach@soccerhub.kz",
    specialization: "",
    bio: "",
  });
  const [notifications, setNotifications] = useState({
    todaySessions: true,
    overdueReports: true,
    scheduleChanges: true,
  });
  const [availableDays, setAvailableDays] = useState(["MON", "TUE", "WED", "THU", "FRI"]);
  const [timeFrom, setTimeFrom] = useState("10:00");
  const [timeTo, setTimeTo] = useState("20:00");
  const [timezone, setTimezone] = useState("Asia/Almaty");
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        const [profileData, availabilityData, notificationData] = await Promise.all([
          CoachApi.getProfile(),
          CoachApi.getAvailability(),
          CoachApi.getNotificationSettings(),
        ]);
        if (!isMounted) return;
        setProfile({
          firstName: profileData.firstName ?? "",
          lastName: profileData.lastName ?? "",
          phone: profileData.phone ?? "",
          email: profileData.email ?? user?.email ?? "",
          specialization: profileData.specialization ?? "",
          bio: profileData.bio ?? "",
        });
        setStatus(profileData.status);
        setGroups(profileData.groups ?? []);
        setAvailableDays(availabilityData.days ?? []);
        setTimeFrom(availabilityData.timeFrom ?? "10:00");
        setTimeTo(availabilityData.timeTo ?? "20:00");
        setTimezone(availabilityData.timezone ?? "Asia/Almaty");
        setNotifications(notificationData);
      } catch (err) {
        if (!isMounted) return;
        console.error(err);
        setError(err instanceof Error ? err.message : "Не удалось загрузить профиль");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void loadProfile();
    return () => {
      isMounted = false;
    };
  }, [user?.email]);

  const initials = useMemo(() => {
    return [profile.firstName, profile.lastName]
      .map((part) => part.trim()[0])
      .filter(Boolean)
      .join("")
      .toUpperCase();
  }, [profile.firstName, profile.lastName]);

  const toggleDay = (day: string) => {
    setAvailableDays((prev) =>
      prev.includes(day) ? prev.filter((item) => item !== day) : [...prev, day]
    );
  };

  const saveProfile = async () => {
    setSectionErrors((prev) => ({ ...prev, profile: "" }));
    if (!profile.firstName.trim() || !profile.lastName.trim()) {
      setSectionErrors((prev) => ({ ...prev, profile: "Укажите имя и фамилию" }));
      return;
    }
    if (!profile.phone.trim()) {
      setSectionErrors((prev) => ({ ...prev, profile: "Укажите телефон" }));
      return;
    }
    setSavingProfile(true);
    try {
      const nextProfile = await CoachApi.updateProfile({
        firstName: profile.firstName.trim(),
        lastName: profile.lastName.trim(),
        phone: profile.phone.trim(),
        email: profile.email.trim(),
        specialization: profile.specialization.trim(),
        bio: profile.bio.trim(),
      });
      setProfile({
        firstName: nextProfile.firstName ?? "",
        lastName: nextProfile.lastName ?? "",
        phone: nextProfile.phone ?? "",
        email: nextProfile.email ?? "",
        specialization: nextProfile.specialization ?? "",
        bio: nextProfile.bio ?? "",
      });
      setStatus(nextProfile.status);
      setGroups(nextProfile.groups ?? []);
      toast.success("Профиль сохранен");
    } catch (err) {
      setSectionErrors((prev) => ({
        ...prev,
        profile: userFriendlyError(err),
      }));
    } finally {
      setSavingProfile(false);
    }
  };

  const saveAvailability = async () => {
    setSectionErrors((prev) => ({ ...prev, availability: "" }));
    if (availableDays.length === 0) {
      setSectionErrors((prev) => ({
        ...prev,
        availability: "Выберите хотя бы один рабочий день",
      }));
      return;
    }
    if (timeFrom >= timeTo) {
      setSectionErrors((prev) => ({
        ...prev,
        availability: "Время окончания должно быть позже начала",
      }));
      return;
    }
    setSavingAvailability(true);
    try {
      const data = await CoachApi.updateAvailability({
        days: availableDays,
        timeFrom,
        timeTo,
        timezone,
      });
      setAvailableDays(data.days ?? []);
      setTimeFrom(data.timeFrom ?? "10:00");
      setTimeTo(data.timeTo ?? "20:00");
      setTimezone(data.timezone ?? "Asia/Almaty");
      toast.success("Доступность сохранена");
    } catch (err) {
      setSectionErrors((prev) => ({
        ...prev,
        availability: userFriendlyError(err),
      }));
    } finally {
      setSavingAvailability(false);
    }
  };

  const changePassword = async () => {
    setSectionErrors((prev) => ({ ...prev, password: "" }));
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      setSectionErrors((prev) => ({
        ...prev,
        password: "Заполните текущий и новый пароль",
      }));
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      setSectionErrors((prev) => ({
        ...prev,
        password: "Новый пароль должен быть минимум 8 символов",
      }));
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setSectionErrors((prev) => ({ ...prev, password: "Пароли не совпадают" }));
      return;
    }
    setSavingPassword(true);
    try {
      await CoachApi.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      toast.success("Пароль обновлен");
    } catch (err) {
      setSectionErrors((prev) => ({
        ...prev,
        password: userFriendlyError(err),
      }));
    } finally {
      setSavingPassword(false);
    }
  };

  const saveNotifications = async () => {
    setSectionErrors((prev) => ({ ...prev, notifications: "" }));
    setSavingNotifications(true);
    try {
      const data = await CoachApi.updateNotificationSettings(notifications);
      setNotifications(data);
      toast.success("Уведомления сохранены");
    } catch (err) {
      setSectionErrors((prev) => ({
        ...prev,
        notifications: userFriendlyError(err),
      }));
    } finally {
      setSavingNotifications(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-teal-100 bg-white px-4 py-3 text-sm text-teal-900/70">
        Загрузка профиля...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-teal-100 bg-white p-5 shadow-sm shadow-teal-900/5">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-teal-950 text-lg font-semibold text-white">
            {initials || <UserCircleIcon className="h-8 w-8" />}
          </div>
          <div className="min-w-0">
            <h1 className="heading-font text-xl font-semibold text-teal-950">
              {profile.firstName} {profile.lastName}
            </h1>
            <div className="mt-1 truncate text-sm text-teal-900/65">{profile.email}</div>
            <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
              <CheckCircleIcon className="h-3.5 w-3.5" />
              {status === "ACTIVE" ? "Активный тренер" : status}
            </div>
          </div>
        </div>
      </section>

      {groups.length > 0 ? (
        <section className={cardClassName}>
          <div className="mb-3 text-sm font-semibold text-teal-950">Мои группы</div>
          <div className="space-y-2">
            {groups.map((group) => (
              <div key={group.groupId} className="rounded-xl bg-teal-50 px-3 py-2 text-sm text-teal-900">
                <div className="font-medium text-teal-950">{group.groupName}</div>
                <div className="text-xs text-teal-900/65">
                  {group.branchName} · {group.role === "MAIN" ? "Главный тренер" : group.role}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className={cardClassName}>
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-teal-950">
          <IdentificationIcon className="h-5 w-5 text-teal-700" />
          Основные данные
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-xs font-medium text-teal-900/65">
            Имя
            <input
              value={profile.firstName}
              onChange={(event) => setProfile({ ...profile, firstName: event.target.value })}
              className={inputClassName}
            />
          </label>
          <label className="space-y-1 text-xs font-medium text-teal-900/65">
            Фамилия
            <input
              value={profile.lastName}
              onChange={(event) => setProfile({ ...profile, lastName: event.target.value })}
              className={inputClassName}
            />
          </label>
          <label className="space-y-1 text-xs font-medium text-teal-900/65">
            Телефон
            <input
              value={profile.phone}
              onChange={(event) => setProfile({ ...profile, phone: event.target.value })}
              className={inputClassName}
            />
          </label>
          <label className="space-y-1 text-xs font-medium text-teal-900/65">
            Email
            <input
              value={profile.email}
              onChange={(event) => setProfile({ ...profile, email: event.target.value })}
              className={inputClassName}
            />
          </label>
        </div>
        <label className="mt-3 block space-y-1 text-xs font-medium text-teal-900/65">
          Специализация
          <input
            value={profile.specialization}
            onChange={(event) => setProfile({ ...profile, specialization: event.target.value })}
            className={inputClassName}
          />
        </label>
        <label className="mt-3 block space-y-1 text-xs font-medium text-teal-900/65">
          О себе
          <textarea
            value={profile.bio}
            onChange={(event) => setProfile({ ...profile, bio: event.target.value })}
            rows={3}
            className={inputClassName}
          />
        </label>
        <div className="mt-3">
          <SectionError message={sectionErrors.profile} />
        </div>
        <button disabled={savingProfile} onClick={saveProfile} className={`${primaryButtonClassName} mt-4`}>
          {savingProfile ? "Сохранение..." : "Сохранить профиль"}
        </button>
      </section>

      <section className={cardClassName}>
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-teal-950">
          <ClockIcon className="h-5 w-5 text-teal-700" />
          Доступность
        </div>
        <div className="grid grid-cols-7 gap-2">
          {DAYS.map((day) => {
            const active = availableDays.includes(day.key);
            return (
              <button
                key={day.key}
                type="button"
                onClick={() => toggleDay(day.key)}
                className={`h-10 rounded-xl text-xs font-semibold transition ${
                  active ? "bg-teal-950 text-white" : "bg-teal-50 text-teal-900"
                }`}
              >
                {day.label}
              </button>
            );
          })}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="space-y-1 text-xs font-medium text-teal-900/65">
            С
            <input type="time" value={timeFrom} onChange={(e) => setTimeFrom(e.target.value)} className={inputClassName} />
          </label>
          <label className="space-y-1 text-xs font-medium text-teal-900/65">
            До
            <input type="time" value={timeTo} onChange={(e) => setTimeTo(e.target.value)} className={inputClassName} />
          </label>
        </div>
        <div className="mt-3 text-xs text-teal-900/55">Часовой пояс: {timezone}</div>
        <div className="mt-3">
          <SectionError message={sectionErrors.availability} />
        </div>
        <button disabled={savingAvailability} onClick={saveAvailability} className={`${primaryButtonClassName} mt-4`}>
          {savingAvailability ? "Сохранение..." : "Сохранить доступность"}
        </button>
      </section>

      <section className={cardClassName}>
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-teal-950">
          <BellIcon className="h-5 w-5 text-teal-700" />
          Уведомления
        </div>
        {[
          ["todaySessions", "Напоминать о тренировках на сегодня"],
          ["overdueReports", "Показывать напоминания о незакрытых отчетах"],
          ["scheduleChanges", "Сообщать об изменениях расписания"],
        ].map(([key, label]) => (
          <label key={key} className="flex items-center justify-between gap-3 border-t border-teal-50 py-3 first:border-t-0">
            <span className="text-sm text-teal-950">{label}</span>
            <input
              type="checkbox"
              checked={notifications[key as keyof typeof notifications]}
              onChange={(event) =>
                setNotifications({
                  ...notifications,
                  [key]: event.target.checked,
                })
              }
              className="h-5 w-5 rounded border-teal-200 text-teal-900"
            />
          </label>
        ))}
        <SectionError message={sectionErrors.notifications} />
        <button disabled={savingNotifications} onClick={saveNotifications} className={`${primaryButtonClassName} mt-3`}>
          {savingNotifications ? "Сохранение..." : "Сохранить уведомления"}
        </button>
      </section>

      <section className={cardClassName}>
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-teal-950">
          <LockClosedIcon className="h-5 w-5 text-teal-700" />
          Безопасность
        </div>
        <div className="space-y-3">
          <input
            type="password"
            value={passwordForm.currentPassword}
            onChange={(event) =>
              setPasswordForm({ ...passwordForm, currentPassword: event.target.value })
            }
            placeholder="Текущий пароль"
            className={inputClassName}
          />
          <input
            type="password"
            value={passwordForm.newPassword}
            onChange={(event) =>
              setPasswordForm({ ...passwordForm, newPassword: event.target.value })
            }
            placeholder="Новый пароль"
            className={inputClassName}
          />
          <input
            type="password"
            value={passwordForm.confirmPassword}
            onChange={(event) =>
              setPasswordForm({ ...passwordForm, confirmPassword: event.target.value })
            }
            placeholder="Повторите новый пароль"
            className={inputClassName}
          />
        </div>
        <div className="mt-3">
          <SectionError message={sectionErrors.password} />
        </div>
        <button disabled={savingPassword} onClick={changePassword} className={`${primaryButtonClassName} mt-4`}>
          {savingPassword ? "Обновление..." : "Обновить пароль"}
        </button>
      </section>

      <section className="rounded-2xl border border-teal-100 bg-teal-50 p-4">
        <div className="flex items-start gap-3">
          <PhoneIcon className="mt-0.5 h-5 w-5 shrink-0 text-teal-700" />
          <div>
            <div className="text-sm font-semibold text-teal-950">Нужна помощь?</div>
            <div className="mt-1 text-sm text-teal-900/65">
              Обратитесь к администратору клуба, если нужно изменить филиал, группы или роль.
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default CoachProfilePage;
