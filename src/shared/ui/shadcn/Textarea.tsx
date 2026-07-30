import * as React from "react";
import { cn } from "../utils";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => (
    <textarea
      className={cn(
        "flex min-h-24 w-full rounded-lg border border-black/[0.12] bg-white px-3 py-2 text-sm text-[#1d1d1f] outline-none placeholder:text-slate-400 focus:border-[#0066cc] focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";

export { Textarea };
