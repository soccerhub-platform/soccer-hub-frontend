import * as React from "react";
import { cn } from "../utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    const usesNativeGeometry = type === "checkbox" || type === "radio" || type === "file" || type === "hidden";

    return (
      <input
        type={type}
        className={cn(
          !usesNativeGeometry &&
            "flex h-10 w-full rounded-lg border border-black/12 bg-white px-3 py-2 text-sm text-[#1d1d1f] outline-hidden placeholder:text-slate-400 focus:border-admin-600 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
