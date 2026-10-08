import { buttonVariants } from "./shadcn/Button";
import { cn } from "./utils";

type ButtonVariant = "primary" | "secondary" | "danger" | "soft" | "softDanger" | "ghost";
type ButtonSize = "sm" | "md";

export const buttonStyles = (
  variant: ButtonVariant,
  size: ButtonSize = "md",
  extraClassName?: string,
) => {
  const mappedVariant = variant === "primary"
    ? "default"
    : variant === "danger"
      ? "destructive"
      : variant === "soft" || variant === "softDanger"
        ? "outline"
        : variant;
  const semanticClass = variant === "soft"
    ? "border-blue-200 bg-blue-50 text-admin-600 hover:bg-blue-100 focus-visible:ring-blue-100"
    : variant === "softDanger"
      ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 focus-visible:ring-rose-100"
      : undefined;

  return cn(
    buttonVariants({ variant: mappedVariant, size: size === "md" ? "default" : "sm" }),
    semanticClass,
    extraClassName,
  );
};
