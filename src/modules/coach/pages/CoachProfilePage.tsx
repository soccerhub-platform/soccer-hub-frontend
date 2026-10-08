import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  Bell,
  CheckCircle,
  Clock3,
  Badge,
  LockKeyhole,
  Phone,
  CircleUserRound,
} from "lucide-react";
import { useAuth } from "../../../shared/AuthContext";
import { CoachApi, CoachProfileGroup } from "../coach.api";
import { getApiErrorMessage } from "../../../shared/api";
import { Button, Checkbox, Input, StatusBadge, Textarea, TimePicker, ToggleGroup, ToggleGroupItem } from "../../../shared/ui";
import {
  ChangePasswordForm,
  UserAvailability,
  UserNotificationSettings,
  validateAvailability,
  validatePasswordForm,
} from "../../../shared/profile/foundation";

const inputClassName =
  "w-full rounded-xl border border-black/12 bg-white px-3 py-2.5 text-sm text-slate-950 outline-hidden transition focus:border-admin-600 focus:ring-4 focus:ring-blue-100";
const cardClassName =
  "rounded-2xl border border-black/12 bg-white p-4 ";

const SectionError: React.FC<{ message: string }> = ({ message }) => {
  if (!message) return null;
  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
      {message}
    </div>
  );
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
  const [notifications, setNotifications] = useState<UserNotificationSettings>({
    todaySessions: true,
    overdueReports: true,
    scheduleChanges: true,
  });
  const [availableDays, setAvailableDays] = useState(["MON", "TUE", "WED", "THU", "FRI"]);
  const [timeFrom, setTimeFrom] = useState("10:00");
  const [timeTo, setTimeTo] = useState("20:00");
  const [timezone, setTimezone] = useState("Asia/Almaty");
  const [passwordForm, setPasswordForm] = useState<ChangePasswordForm>({
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
        profile: getApiErrorMessage(err, "Не удалось сохранить профиль"),
      }));
    } finally {
      setSavingProfile(false);
    }
  };

  const saveAvailability = async () => {
    setSectionErrors((prev) => ({ ...prev, availability: "" }));
    const availability: UserAvailability = {
      days: availableDays,
      timeFrom,
      timeTo,
      timezone,
    };
    const availabilityError = validateAvailability(availability);
    if (availabilityError) {
      setSectionErrors((prev) => ({
        ...prev,
        availability: availabilityError,
      }));
      return;
    }
    setSavingAvailability(true);
    try {
      const data = await CoachApi.updateAvailability(availability);
      setAvailableDays(data.days ?? []);
      setTimeFrom(data.timeFrom ?? "10:00");
      setTimeTo(data.timeTo ?? "20:00");
      setTimezone(data.timezone ?? "Asia/Almaty");
      toast.success("Доступность сохранена");
    } catch (err) {
      setSectionErrors((prev) => ({
        ...prev,
        availability: getApiErrorMessage(err, "Не удалось сохранить доступность"),
      }));
    } finally {
      setSavingAvailability(false);
    }
  };

  const changePassword = async () => {
    setSectionErrors((prev) => ({ ...prev, password: "" }));
    const passwordError = validatePasswordForm(passwordForm);
    if (passwordError) {
      setSectionErrors((prev) => ({
        ...prev,
        password: passwordError,
      }));
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
        password: getApiErrorMessage(err, "Не удалось обновить пароль"),
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
        notifications: getApiErrorMessage(err, "Не удалось сохранить уведомления"),
      }));
    } finally {
      setSavingNotifications(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-black/12 bg-white px-4 py-3 text-sm text-slate-500">
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
      <section className="rounded-2xl border border-black/12 bg-white p-5 ">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#1d1d1f] text-lg font-semibold text-white">
            {initials || <CircleUserRound className="h-8 w-8" />}
          </div>
          <div className="min-w-0">
            <h1 className="ui-page-title">
              {profile.firstName} {profile.lastName}
            </h1>
            <div className="mt-1 truncate text-sm text-slate-500">{profile.email}</div>
            <StatusBadge tone="success" className="mt-2 gap-1">
              <CheckCircle />
              {status === "ACTIVE" ? "Активный тренер" : status}
            </StatusBadge>
          </div>
        </div>
      </section>

      {groups.length > 0 ? (
        <section className={cardClassName}>
          <div className="mb-3 ui-section-title">Мои группы</div>
          <div className="space-y-2">
            {groups.map((group) => (
              <div key={group.groupId} className="rounded-xl bg-blue-50 px-3 py-2 text-sm text-slate-700">
                <div className="font-medium text-slate-950">{group.groupName}</div>
                <div className="text-xs text-slate-500">
                  {group.branchName} · {group.role === "MAIN" ? "Главный тренер" : group.role}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className={cardClassName}>
        <div className="mb-4 flex items-center gap-2 ui-section-title">
          <Badge className="h-5 w-5 text-admin-600" />
          Основные данные
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-xs font-medium text-slate-500">
            Имя
            <Input
              value={profile.firstName}
              onChange={(event) => setProfile({ ...profile, firstName: event.target.value })}
              className={inputClassName}
            />
          </label>
          <label className="space-y-1 text-xs font-medium text-slate-500">
            Фамилия
            <Input
              value={profile.lastName}
              onChange={(event) => setProfile({ ...profile, lastName: event.target.value })}
              className={inputClassName}
            />
          </label>
          <label className="space-y-1 text-xs font-medium text-slate-500">
            Телефон
            <Input
              value={profile.phone}
              onChange={(event) => setProfile({ ...profile, phone: event.target.value })}
              className={inputClassName}
            />
          </label>
          <label className="space-y-1 text-xs font-medium text-slate-500">
            Email
            <Input
              value={profile.email}
              onChange={(event) => setProfile({ ...profile, email: event.target.value })}
              className={inputClassName}
            />
          </label>
        </div>
        <label className="mt-3 block space-y-1 text-xs font-medium text-slate-500">
          Специализация
          <Input
            value={profile.specialization}
            onChange={(event) => setProfile({ ...profile, specialization: event.target.value })}
            className={inputClassName}
          />
        </label>
        <label className="mt-3 block space-y-1 text-xs font-medium text-slate-500">
          О себе
          <Textarea
            value={profile.bio}
            onChange={(event) => setProfile({ ...profile, bio: event.target.value })}
            rows={3}
            className={inputClassName}
          />
        </label>
        <div className="mt-3">
          <SectionError message={sectionErrors.profile} />
        </div>
        <Button disabled={savingProfile} onClick={saveProfile} className="mt-4 w-full">
          {savingProfile ? "Сохранение..." : "Сохранить профиль"}
        </Button>
      </section>

      <section className={cardClassName}>
        <div className="mb-4 flex items-center gap-2 ui-section-title">
          <Clock3 className="h-5 w-5 text-admin-600" />
          Доступность
        </div>
        <ToggleGroup type="multiple" value={availableDays} onValueChange={setAvailableDays} variant="outline" className="grid grid-cols-7 gap-2">
          {DAYS.map((day) => <ToggleGroupItem key={day.key} value={day.key} className="w-full px-0 text-xs">{day.label}</ToggleGroupItem>)}
        </ToggleGroup>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="space-y-1 text-xs font-medium text-slate-500">
            С
            <TimePicker value={timeFrom} onValueChange={setTimeFrom} />
          </label>
          <label className="space-y-1 text-xs font-medium text-slate-500">
            До
            <TimePicker value={timeTo} onValueChange={setTimeTo} />
          </label>
        </div>
        <div className="mt-3 text-xs text-slate-400">Часовой пояс: {timezone}</div>
        <div className="mt-3">
          <SectionError message={sectionErrors.availability} />
        </div>
        <Button disabled={savingAvailability} onClick={saveAvailability} className="mt-4 w-full">
          {savingAvailability ? "Сохранение..." : "Сохранить доступность"}
        </Button>
      </section>

      <section className={cardClassName}>
        <div className="mb-4 flex items-center gap-2 ui-section-title">
          <Bell className="h-5 w-5 text-admin-600" />
          Уведомления
        </div>
        {[
          ["todaySessions", "Напоминать о тренировках на сегодня"],
          ["overdueReports", "Показывать напоминания о незакрытых отчетах"],
          ["scheduleChanges", "Сообщать об изменениях расписания"],
        ].map(([key, label]) => (
          <label key={key} className="flex items-center justify-between gap-3 border-t border-black/6 py-3 first:border-t-0">
            <span className="text-sm text-slate-950">{label}</span>
            <Checkbox
              checked={notifications[key as keyof typeof notifications]}
              onCheckedChange={(checked) =>
                setNotifications({
                  ...notifications,
                  [key]: checked === true,
                })
              }
            />
          </label>
        ))}
        <SectionError message={sectionErrors.notifications} />
        <Button disabled={savingNotifications} onClick={saveNotifications} className="mt-3 w-full">
          {savingNotifications ? "Сохранение..." : "Сохранить уведомления"}
        </Button>
      </section>

      <section className={cardClassName}>
        <div className="mb-4 flex items-center gap-2 ui-section-title">
          <LockKeyhole className="h-5 w-5 text-admin-600" />
          Безопасность
        </div>
        <div className="space-y-3">
          <Input
            type="password"
            value={passwordForm.currentPassword}
            onChange={(event) =>
              setPasswordForm({ ...passwordForm, currentPassword: event.target.value })
            }
            placeholder="Текущий пароль"
            className={inputClassName}
          />
          <Input
            type="password"
            value={passwordForm.newPassword}
            onChange={(event) =>
              setPasswordForm({ ...passwordForm, newPassword: event.target.value })
            }
            placeholder="Новый пароль"
            className={inputClassName}
          />
          <Input
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
        <Button disabled={savingPassword} onClick={changePassword} className="mt-4 w-full">
          {savingPassword ? "Обновление..." : "Обновить пароль"}
        </Button>
      </section>

      <section className="rounded-2xl border border-black/12 bg-blue-50 p-4">
        <div className="flex items-start gap-3">
          <Phone className="mt-0.5 h-5 w-5 shrink-0 text-admin-600" />
          <div>
            <div className="ui-section-title">Нужна помощь?</div>
            <div className="mt-1 text-sm text-slate-500">
              Обратитесь к администратору клуба, если нужно изменить филиал, группы или роль.
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default CoachProfilePage;
