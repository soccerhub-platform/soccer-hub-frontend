import React, { useEffect, useState } from "react";
import type { MediaAsset } from "../../../../shared/media.types";
import { resolveApiUrl } from "../../../../shared/api";

type GroupAvatarSize = "sm" | "md" | "lg";

const avatarUrl = (avatar?: MediaAsset | null, size: GroupAvatarSize = "sm") => {
  if (!avatar) return null;
  const url = size === "sm"
    ? avatar.thumbUrl || avatar.mediumUrl || avatar.originalUrl
    : avatar.mediumUrl || avatar.originalUrl || avatar.thumbUrl;
  return url ? resolveApiUrl(url) : null;
};

const initials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Г";
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
};

const sizeClasses: Record<GroupAvatarSize, string> = {
  sm: "h-10 w-10 text-sm",
  md: "h-12 w-12 text-base",
  lg: "h-20 w-20 text-xl",
};

const GroupAvatar: React.FC<{
  name: string;
  avatar?: MediaAsset | null;
  size?: GroupAvatarSize;
  className?: string;
}> = ({ name, avatar, size = "sm", className = "" }) => {
  const src = avatarUrl(avatar, size);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  useEffect(() => {
    setFailedSrc(null);
  }, [src]);

  if (src && failedSrc !== src) {
    return (
      <img
        src={src}
        alt={`Фото группы ${name}`}
        className={`${sizeClasses[size]} shrink-0 rounded-lg border border-slate-200 object-cover ${className}`}
        onError={() => setFailedSrc(src)}
      />
    );
  }

  return (
    <div
      className={`${sizeClasses[size]} flex shrink-0 items-center justify-center rounded-lg border border-cyan-100 bg-cyan-50 font-semibold text-cyan-800 ${className}`}
      aria-label={`Группа ${name}`}
    >
      {initials(name)}
    </div>
  );
};

export default GroupAvatar;
