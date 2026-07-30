import React from "react";
import { cn } from "./utils";

type FilterBarProps = React.HTMLAttributes<HTMLElement> & {
  children: React.ReactNode;
  trailing?: React.ReactNode;
};

const FilterBar: React.FC<FilterBarProps> = ({ children, trailing, className, ...props }) => (
  <section
    aria-label="Фильтры"
    className={cn(
      "flex flex-col gap-3 rounded-2xl border border-black/[0.08] bg-white p-3 sm:flex-row sm:items-center sm:justify-between",
      className,
    )}
    {...props}
  >
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">{children}</div>
    {trailing ? <div className="flex shrink-0 items-center gap-2">{trailing}</div> : null}
  </section>
);

export default FilterBar;
