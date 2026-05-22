import React from "react";
import classNames from "classnames";
import { buttonStyles } from "./buttonStyles";

type ButtonVariant = "primary" | "secondary" | "danger" | "soft" | "softDanger" | "ghost";
type ButtonSize = "sm" | "md";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  rounded?: string;
  isLoading?: boolean;
};

const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  size = "md",
  rounded = "rounded-xl",
  isLoading = false,
  disabled,
  className,
  children,
  ...props
}) => {
  return (
    <button
      {...props}
      disabled={disabled || isLoading}
      className={buttonStyles(variant, size, classNames(rounded, className))}
    >
      {isLoading ? "Сохранение..." : children}
    </button>
  );
};

export default Button;
