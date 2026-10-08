import React from "react";
import { Input } from "./shadcn/Input";
import { cn } from "./utils";

type DatePickerProps = Pick<React.InputHTMLAttributes<HTMLInputElement>, "id" | "name" | "aria-describedby" | "aria-labelledby" | "onBlur"> & {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  min?: string;
  max?: string;
  disabled?: boolean;
  clearable?: boolean;
  className?: string;
  "aria-invalid"?: boolean;
};

const DatePicker = React.forwardRef<HTMLInputElement, DatePickerProps>(({
  value = "",
  onValueChange,
  placeholder,
  min,
  max,
  disabled = false,
  className,
  "aria-invalid": ariaInvalid,
  id, name, onBlur,
  "aria-describedby": describedBy,
  "aria-labelledby": labelledBy,
}, ref) => (
  <Input
    id={id}
    name={name}
    onBlur={onBlur}
    aria-describedby={describedBy}
    aria-labelledby={labelledBy}
    ref={ref}
    type="date"
    value={value}
    min={min}
    max={max}
    disabled={disabled}
    aria-invalid={ariaInvalid}
    aria-label={placeholder}
    onChange={(event) => onValueChange(event.target.value)}
    onInput={(event) => onValueChange(event.currentTarget.value)}
    className={cn("w-full", className)}
  />
));
DatePicker.displayName = "DatePicker";

export default DatePicker;
