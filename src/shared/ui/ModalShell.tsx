import React from "react";
import classNames from "classnames";
import EntitySheet from "./EntitySheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./shadcn/Dialog";

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

  if (isRight) {
    return (
      <EntitySheet
        title={title}
        description={description}
        eyebrow={eyebrow}
        onClose={onClose}
        closeDisabled={closeDisabled}
        contentClassName={classNames(maxWidthClassName, heightClassName)}
        bodyClassName={bodyClassName}
        footer={footer}
      >
        {children}
      </EntitySheet>
    );
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !closeDisabled && onClose()}>
      <DialogContent
        closeDisabled={closeDisabled}
        onEscapeKeyDown={(event) => closeDisabled && event.preventDefault()}
        onPointerDownOutside={(event) => closeDisabled && event.preventDefault()}
        className={classNames(
          "flex max-h-[calc(100dvh-1.5rem)] w-[calc(100%-1.5rem)] flex-col gap-0 overflow-hidden p-0 sm:max-h-[calc(100dvh-2rem)]",
          maxWidthClassName,
          heightClassName
        )}
      >
        <DialogHeader className="shrink-0 border-b border-slate-200 bg-white px-5 py-3.5 pr-14">
              {eyebrow ? (
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-admin-600">
                  {eyebrow}
                </div>
              ) : null}
              <DialogTitle className="ui-modal-title text-[#1d1d1f]!">{title}</DialogTitle>
              {description ? <DialogDescription className="text-xs leading-5 text-slate-500">{description}</DialogDescription> : null}
        </DialogHeader>

        <div className={classNames("min-h-0 flex-1 overflow-y-auto px-5 py-4", bodyClassName)}>
          {children}
        </div>

        {footer ? (
          <div className="shrink-0 border-t border-slate-200 bg-white px-5 py-3.5">
            {footer}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};

export default ModalShell;
