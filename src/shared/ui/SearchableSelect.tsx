import React, { useMemo, useRef, useState } from "react";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  useComboboxAnchor,
} from "./shadcn";
import { cn } from "./utils";

export type SearchableSelectOption = {
  value: string;
  label: string;
  description?: string;
  keywords?: string;
  disabled?: boolean;
};

type SearchableSelectProps = {
  value?: string;
  onValueChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  onSearchChange?: (value: string) => void;
};

const SearchableSelect = React.forwardRef<HTMLDivElement, SearchableSelectProps>(({
  value = "",
  onValueChange,
  options,
  placeholder = "Выберите значение",
  searchPlaceholder,
  emptyText = "Ничего не найдено",
  loading = false,
  disabled = false,
  className,
  onSearchChange,
}, ref) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const anchorRef = useComboboxAnchor();
  const searchCallbackRef = useRef(onSearchChange);
  searchCallbackRef.current = onSearchChange;
  const selected = useMemo(() => options.find((option) => option.value === value) ?? null, [options, value]);
  const overlayContainer = anchorRef.current?.closest<HTMLElement>('[role="dialog"]') ?? undefined;

  return (
    <div ref={ref} className={cn("w-full", className)}>
      <Combobox
        items={options}
        value={selected}
        inputValue={open ? query : selected?.label ?? ""}
        disabled={disabled}
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          setQuery("");
          if (!nextOpen) searchCallbackRef.current?.("");
        }}
        onInputValueChange={(inputValue, { reason }) => {
          if (reason === "item-press") return;
          setQuery(inputValue);
          searchCallbackRef.current?.(inputValue);
        }}
        onValueChange={(option) => {
          if (option) {
            setQuery("");
            onValueChange(option.value);
          }
        }}
        isItemEqualToValue={(option, selectedOption) => option.value === selectedOption.value}
        itemToStringLabel={(option) => option.label}
        filter={(option, query) => {
          const normalizedQuery = query.trim().toLocaleLowerCase("ru");
          if (!normalizedQuery) return true;

          return [option.label, option.description, option.keywords]
            .filter(Boolean)
            .join(" ")
            .toLocaleLowerCase("ru")
            .includes(normalizedQuery);
        }}
      >
        <div ref={anchorRef} className="w-full">
          <ComboboxInput
            disabled={disabled}
            placeholder={loading ? "Загрузка..." : open ? searchPlaceholder ?? placeholder : placeholder}
            aria-label={placeholder}
            className="w-full"
          />
        </div>
        <ComboboxContent
          anchor={anchorRef}
          portalContainer={overlayContainer}
          className="bg-white text-[#1d1d1f]"
        >
          <ComboboxEmpty>{loading ? "Загрузка..." : emptyText}</ComboboxEmpty>
          <ComboboxList>
            {(option: SearchableSelectOption) => (
              <ComboboxItem key={option.value} value={option} disabled={option.disabled}>
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{option.label}</span>
                  {option.description ? <span className="mt-0.5 block truncate text-xs text-slate-500">{option.description}</span> : null}
                </span>
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  );
});
SearchableSelect.displayName = "SearchableSelect";

export default SearchableSelect;
