import classNames from "classnames";

type ButtonVariant =
  | "primary"
  | "secondary"
  | "danger"
  | "soft"
  | "softDanger"
  | "ghost";

type ButtonSize = "sm" | "md";

const baseClassName =
  "inline-flex items-center justify-center gap-2 font-medium transition focus-visible:outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:shadow-none";

const sizeClassNames: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2.5 text-sm",
};

const variantClassNames: Record<ButtonVariant, string> = {
  primary:
    "bg-cyan-700 text-white shadow-sm hover:bg-cyan-800 focus-visible:ring-cyan-200 disabled:bg-cyan-300",
  secondary:
    "border border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50 focus-visible:ring-slate-200 disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400",
  danger:
    "border border-rose-200 bg-white text-rose-700 hover:bg-rose-50 focus-visible:ring-rose-100 disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400",
  soft:
    "border border-cyan-200 bg-cyan-50 text-cyan-900 hover:bg-cyan-100 focus-visible:ring-cyan-100 disabled:border-cyan-100 disabled:bg-cyan-50/60 disabled:text-cyan-500",
  softDanger:
    "border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 focus-visible:ring-rose-100 disabled:border-rose-100 disabled:bg-rose-50/60 disabled:text-rose-400",
  ghost:
    "border border-transparent bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-800 focus-visible:ring-slate-200 disabled:text-slate-400",
};

export const buttonStyles = (
  variant: ButtonVariant,
  size: ButtonSize = "md",
  extraClassName?: string
) =>
  classNames(baseClassName, sizeClassNames[size], variantClassNames[variant], extraClassName);
