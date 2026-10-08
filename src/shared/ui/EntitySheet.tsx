import React from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "./shadcn/sheet";
import { cn } from "./utils";

type EntitySheetProps = {
  open?: boolean;
  title: string;
  description?: string;
  eyebrow?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  onClose: () => void;
  closeDisabled?: boolean;
  contentClassName?: string;
  bodyClassName?: string;
};

const EntitySheet: React.FC<EntitySheetProps> = ({
  open = true,
  title,
  description,
  eyebrow,
  children,
  footer,
  onClose,
  closeDisabled = false,
  contentClassName,
  bodyClassName,
}) => {
  // These controlled sheets have no Radix trigger. Preserve the actual opener.
  const opener = React.useRef<HTMLElement | null>(
    typeof document !== "undefined" && document.activeElement instanceof HTMLElement ? document.activeElement : null,
  );
  return (
  <Sheet
    open={open}
    onOpenChange={(nextOpen) => {
      if (!nextOpen && !closeDisabled) onClose();
    }}
  >
    <SheetContent
      data-slot="entity-sheet-content"
      side="right"
      closeDisabled={closeDisabled}
      onEscapeKeyDown={(event) => closeDisabled && event.preventDefault()}
      onPointerDownOutside={(event) => closeDisabled && event.preventDefault()}
      onCloseAutoFocus={(event) => {
        if (opener.current?.isConnected && opener.current !== document.body) {
          event.preventDefault();
          opener.current.focus({ preventScroll: true });
        }
      }}
      className={cn(
        "flex w-full max-w-lg flex-col gap-0 border-l border-black/[0.1] bg-white p-0 shadow-none",
        contentClassName,
      )}
    >
      <SheetHeader data-slot="entity-sheet-header" className="shrink-0 border-b border-black/[0.08] px-5 py-4 pr-14 text-left">
        {eyebrow ? (
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0066cc]">
            {eyebrow}
          </div>
        ) : null}
        <SheetTitle className="ui-modal-title !text-[#1d1d1f] dark:!text-[#1d1d1f]">
          {title}
        </SheetTitle>
        {description ? (
          <SheetDescription className="max-w-md leading-5 text-slate-500 dark:text-slate-500">
            {description}
          </SheetDescription>
        ) : null}
      </SheetHeader>
      <div data-slot="entity-sheet-body" className={cn("min-h-0 flex-1 overflow-y-auto px-5 py-5", bodyClassName)}>{children}</div>
      {footer ? (
        <SheetFooter data-slot="entity-sheet-footer" className="shrink-0 border-t border-black/[0.08] px-5 py-4 sm:space-x-0">
          {footer}
        </SheetFooter>
      ) : null}
    </SheetContent>
  </Sheet>
  );
};

export default EntitySheet;
