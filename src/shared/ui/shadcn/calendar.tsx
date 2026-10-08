import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayButton, DayPicker, getDefaultClassNames } from "react-day-picker";
import { ru } from "date-fns/locale";
import { cn } from "../utils";
import { ShadcnButton, buttonVariants } from "./Button";

const Calendar = ({
  className,
  classNames,
  showOutsideDays = true,
  locale = ru,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker>) => {
  const defaults = getDefaultClassNames();

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      locale={locale}
      className={cn("w-fit bg-white p-3 [--cell-size:2.25rem]", className)}
      classNames={{
        root: cn("w-fit", defaults.root),
        months: cn("relative flex flex-col gap-4", defaults.months),
        month: cn("flex w-full flex-col gap-4", defaults.month),
        nav: cn("absolute inset-x-0 top-0 flex items-center justify-between", defaults.nav),
        button_previous: cn(buttonVariants({ variant: "ghost", size: "icon" }), "h-(--cell-size) w-(--cell-size) p-0", defaults.button_previous),
        button_next: cn(buttonVariants({ variant: "ghost", size: "icon" }), "h-(--cell-size) w-(--cell-size) p-0", defaults.button_next),
        month_caption: cn("flex h-(--cell-size) items-center justify-center px-(--cell-size)", defaults.month_caption),
        caption_label: cn("text-sm font-semibold capitalize", defaults.caption_label),
        dropdowns: cn("flex items-center gap-2", defaults.dropdowns),
        dropdown_root: cn("relative", defaults.dropdown_root),
        dropdown: cn("h-8 rounded-lg border border-black/12 bg-white px-2 text-sm font-medium text-[#1d1d1f] outline-hidden focus:border-admin-600 focus:ring-4 focus:ring-blue-100", defaults.dropdown),
        month_grid: cn("w-full border-collapse", defaults.month_grid),
        weekdays: cn("flex", defaults.weekdays),
        weekday: cn("flex-1 select-none text-xs font-normal text-slate-500", defaults.weekday),
        week: cn("mt-1 flex w-full", defaults.week),
        day: cn("group/day relative aspect-square h-full w-full p-0 text-center", defaults.day),
        today: cn("rounded-lg bg-slate-100 text-slate-950", defaults.today),
        outside: cn("text-slate-400", defaults.outside),
        disabled: cn("pointer-events-none text-slate-300 opacity-50", defaults.disabled),
        hidden: cn("invisible", defaults.hidden),
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) => orientation === "left" ? <ChevronLeft /> : <ChevronRight />,
        DayButton: CalendarDayButton,
        ...components,
      }}
      {...props}
    />
  );
};

const CalendarDayButton = ({ className, day, modifiers, ...props }: React.ComponentProps<typeof DayButton>) => {
    const localRef = React.useRef<HTMLButtonElement>(null);
    React.useEffect(() => {
      if (modifiers.focused) localRef.current?.focus();
    }, [modifiers.focused]);

    return (
      <ShadcnButton
        ref={localRef}
        variant="ghost"
        size="icon"
        data-day={day.date.toLocaleDateString()}
        data-selected={modifiers.selected}
        className={cn(
          "h-auto w-full min-w-(--cell-size) rounded-lg p-0 font-normal data-[selected=true]:bg-admin-600 data-[selected=true]:text-white",
          className,
        )}
        {...props}
      />
    );
};

export { Calendar, CalendarDayButton };
