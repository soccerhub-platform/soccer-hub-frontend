import React from "react";
import { Clock3 } from "lucide-react";
import { InputGroup, InputGroupAddon, InputGroupInput } from "./shadcn/input-group";
import { cn } from "./utils";

type TimePickerProps = {
  value?: string;
  onValueChange: (value: string) => void;
  minuteStep?: number;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
  "aria-invalid"?: boolean;
};

const normalizeTime = (value: string) => {
  const match = value.match(/^(\d{1,2}):(\d{1,2})$/);
  if (!match) return value;

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return value;

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
};

const TimePicker: React.FC<TimePickerProps> = ({
  value = "",
  onValueChange,
  minuteStep = 5,
  disabled = false,
  className,
  "aria-label": ariaLabel,
  "aria-invalid": ariaInvalid,
}) => (
  <InputGroup data-disabled={disabled || undefined} className={cn("w-full", className)}>
    <InputGroupAddon align="inline-start">
      <Clock3 />
    </InputGroupAddon>
    <InputGroupInput
      type="time"
      aria-label={ariaLabel || "Время"}
      value={value}
      step={minuteStep * 60}
      disabled={disabled}
      aria-invalid={ariaInvalid}
      onChange={(event) => onValueChange(event.target.value)}
      onBlur={(event) => {
        const nextValue = normalizeTime(event.target.value);
        if (nextValue !== value) onValueChange(nextValue);
      }}
    />
  </InputGroup>
);

export default TimePicker;
