import React from "react";
import { Badge, type BadgeProps } from "./shadcn/Badge";

export type StatusTone = "info" | "success" | "warning" | "danger" | "neutral";

type StatusBadgeProps = Omit<BadgeProps, "variant"> & {
  tone?: StatusTone;
};

const variants: Record<StatusTone, BadgeProps["variant"]> = {
  info: "default",
  success: "success",
  warning: "warning",
  danger: "destructive",
  neutral: "secondary",
};

const StatusBadge: React.FC<StatusBadgeProps> = ({ tone = "neutral", ...props }) => (
  <Badge variant={variants[tone]} {...props} />
);

export default StatusBadge;
