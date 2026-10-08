import React from "react";
import classNames from "classnames";

type FormFieldProps = {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
};

export const formControlClassName =
  "w-full rounded-lg border border-black/[0.12] bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#0066cc] focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400";

const FormField: React.FC<FormFieldProps> = ({ label, error, hint, children, className }) => {
  return (
    <label className={classNames("flex flex-col gap-1 text-xs font-medium text-slate-600", className)}>
      <span>{label}</span>
      {children}
      {error ? <span className="block text-xs font-medium text-rose-600">{error}</span> : null}
      {!error && hint ? <span className="block text-xs font-normal text-slate-600">{hint}</span> : null}
    </label>
  );
};

export default FormField;
