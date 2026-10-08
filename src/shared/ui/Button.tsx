import React from "react";
import { cn } from "./utils";
import { ShadcnButton, type ShadcnButtonProps } from "./shadcn/Button";

type ButtonVariant = "primary" | "secondary" | "danger" | "soft" | "softDanger" | "ghost";
type ButtonSize = "sm" | "md";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  rounded?: string;
  isLoading?: boolean;
};

const variants = {
  primary: "default",
  secondary: "secondary",
  danger: "destructive",
  soft: "outline",
  softDanger: "outline",
  ghost: "ghost",
} as const satisfies Record<ButtonVariant, NonNullable<ShadcnButtonProps["variant"]>>;

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = "primary",
  size = "md",
  rounded = "rounded-lg",
  isLoading = false,
  disabled,
  className,
  children,
  ...props
}, ref) => {
  const variantClassName = variant === "soft"
    ? "border-blue-200 bg-blue-50 text-admin-600 hover:bg-blue-100 focus-visible:ring-blue-100"
    : variant === "softDanger"
      ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 focus-visible:ring-rose-100"
      : undefined;

  return (
    <ShadcnButton
      ref={ref}
      {...props}
      disabled={disabled || isLoading}
      variant={variants[variant]}
      size={size === "md" ? "default" : "sm"}
      className={cn(rounded, variantClassName, className)}
    >
      {isLoading ? "Сохранение..." : children}
    </ShadcnButton>
  );
});
Button.displayName = "Button";

export default Button;
