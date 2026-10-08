import React, { useRef, useState } from "react";
import { ChevronDown, MoreHorizontal } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Button from "./Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./shadcn/dropdown-menu";
import { cn } from "./utils";

export type ActionMenuItem = {
  key: string;
  label: string;
  icon?: React.ReactNode;
  onSelect?: () => void;
  to?: string;
  disabled?: boolean;
  danger?: boolean;
  separatorBefore?: boolean;
};

type ActionMenuProps = {
  items: ActionMenuItem[];
  label?: string;
  compact?: boolean;
  align?: "start" | "center" | "end";
  className?: string;
};

const ActionMenu: React.FC<ActionMenuProps> = ({
  items,
  label = "Действия",
  compact = false,
  align = "end",
  className,
}) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const navigating = useRef(false);

  return <DropdownMenu open={open} onOpenChange={setOpen}>
    <DropdownMenuTrigger asChild>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className={cn(compact ? "h-9 w-9 p-0" : "h-10", className)}
        aria-label={compact ? label : undefined}
      >
        {compact ? <MoreHorizontal className="h-4 w-4" /> : <>{label}<ChevronDown className="h-4 w-4" /></>}
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent
      onCloseAutoFocus={event => {
        if (navigating.current) event.preventDefault();
        navigating.current = false;
      }}
      align={align}
      className="min-w-52 rounded-xl border-black/10 p-1.5 shadow-none"
    >
      <DropdownMenuGroup>
        {items.map((item) => (
          <React.Fragment key={item.key}>
            {item.separatorBefore ? <DropdownMenuSeparator className="bg-black/8" /> : null}
            <DropdownMenuItem
              disabled={item.disabled}
              onSelect={() => {
                setOpen(false);
                if (item.to) {
                  navigating.current = true;
                  navigate(item.to);
                  return;
                }
                item.onSelect?.();
              }}
              className={cn(
                "min-h-10 cursor-pointer rounded-lg px-3",
                item.danger && "text-rose-700 focus:bg-rose-50 focus:text-rose-700",
              )}
            >
              {item.icon}{item.label}
            </DropdownMenuItem>
          </React.Fragment>
        ))}
      </DropdownMenuGroup>
    </DropdownMenuContent>
  </DropdownMenu>;
};

export default ActionMenu;
