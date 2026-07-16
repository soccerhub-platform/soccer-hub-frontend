import React, { useEffect } from "react";
import { createPortal } from "react-dom";
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
  placement?: "center" | "right";
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
  placement = "center",
}) => {
  const isRight = placement === "right";

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const modal = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className={classNames(
        "fixed inset-0 z-[80] flex h-[100dvh] w-[100dvw] bg-slate-950/35 backdrop-blur-[2px]",
        isRight
          ? "items-stretch justify-end"
          : "items-start justify-center overflow-y-auto p-3 sm:items-center sm:p-4"
      )}
    >
      <div
        className={classNames(
          "flex w-full flex-col overflow-hidden border border-slate-200 bg-white shadow-[0_24px_70px_-28px_rgba(15,23,42,0.45)]",
          isRight
            ? "h-full max-h-none rounded-none border-y-0 border-r-0 sm:rounded-l-xl"
            : "my-auto max-h-[calc(100dvh-1.5rem)] rounded-xl sm:max-h-[calc(100dvh-2rem)]",
          maxWidthClassName,
          heightClassName
        )}
      >
        <div className="border-b border-slate-200 bg-white px-5 py-3.5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              {eyebrow ? (
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-700">
                  {eyebrow}
                </div>
              ) : null}
              <h3 className="heading-font text-lg font-semibold text-slate-900">{title}</h3>
              {description ? <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p> : null}
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

        <div className={classNames("min-h-0 flex-1 overflow-y-auto px-5 py-4", bodyClassName)}>
          {children}
        </div>

        {footer ? (
          <div className="border-t border-slate-200 bg-white px-5 py-3.5">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};

export default ModalShell;
