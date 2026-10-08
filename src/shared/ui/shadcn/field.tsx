import React from "react";
import { cn } from "../utils";

// Semantic form composition for the project's existing shadcn controls.
export function FieldGroup({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-5", className)} {...props} />;
}
export function Field({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="field" className={cn("flex min-w-0 flex-col gap-2", className)} {...props} />;
}
export function FieldLabel({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("text-sm font-medium text-slate-700", className)} {...props} />;
}
export function FieldDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-xs leading-5 text-slate-600", className)} {...props} />;
}
export function FieldError({ children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return children ? <p role="alert" className="text-xs font-medium text-rose-700" {...props}>{children}</p> : null;
}
