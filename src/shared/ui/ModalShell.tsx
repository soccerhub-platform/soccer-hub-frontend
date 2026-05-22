import React from "react";
import classNames from "classnames";
import { XMarkIcon } from "@heroicons/react/24/outline";
import Button from "./Button";

type ModalShellProps = {
  title: string;
  description?: string;
  eyebrow?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  onClose: () => void;
  maxWidthClassName?: string;
  heightClassName?: string;
  bodyClassName?: string;
  closeDisabled?: boolean;
};

const ModalShell: React.FC<ModalShellProps> = ({
  title,
  description,
  eyebrow,
  children,
  footer,
  onClose,
  maxWidthClassName = "max-w-2xl",
  heightClassName,
  bodyClassName,
  closeDisabled = false,
}) => {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 p-3 backdrop-blur-sm sm:p-4">
      <div
        className={classNames(
          "flex w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl",
          maxWidthClassName,
          heightClassName
        )}
      >
        <div className="border-b border-slate-200 bg-white px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              {eyebrow ? (
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-700">
                  {eyebrow}
                </div>
              ) : null}
              <h3 className="heading-font text-xl font-semibold text-slate-900">{title}</h3>
              {description ? <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p> : null}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              rounded="rounded-full"
              disabled={closeDisabled}
              onClick={onClose}
              className="h-9 w-9 p-0 text-slate-400"
              aria-label="Закрыть"
            >
              <XMarkIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className={classNames("min-h-0 flex-1 overflow-y-auto px-6 py-5", bodyClassName)}>
          {children}
        </div>

        {footer ? (
          <div className="border-t border-slate-200 bg-white px-6 py-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default ModalShell;
