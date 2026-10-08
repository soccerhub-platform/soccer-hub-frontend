import React from "react";
import DatePicker from "./DatePicker";
import TimePicker from "./TimePicker";
import { cn } from "./utils";

type DateTimePickerProps = {
  value?: string;
  onValueChange: (value: string) => void;
  minDate?: string;
  maxDate?: string;
  disabled?: boolean;
  minuteStep?: number;
  className?: string;
  "aria-invalid"?: boolean;
  "aria-label"?: string;
};

const DateTimePicker: React.FC<DateTimePickerProps> = ({
  value = "",
  onValueChange,
  minDate,
  maxDate,
  disabled,
  minuteStep,
  className,
  "aria-invalid": ariaInvalid,
  "aria-label": ariaLabel,
}) => {
  const [date = "", time = ""] = value.split("T");
  const update = (nextDate: string, nextTime: string) => {
    if (!nextDate) onValueChange("");
    else onValueChange(`${nextDate}T${nextTime || "09:00"}`);
  };

  return (
    <div className={cn("grid gap-2 sm:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]", className)}>
      <DatePicker
        placeholder={ariaLabel ? `${ariaLabel} — дата` : "Дата"}
        value={date}
        onValueChange={(nextDate) => update(nextDate, time)}
        min={minDate}
        max={maxDate}
        disabled={disabled}
        aria-invalid={ariaInvalid}
      />
      <TimePicker
        aria-label={ariaLabel ? `${ariaLabel} — время` : "Время"}
        value={time}
        onValueChange={(nextTime) => update(date, nextTime)}
        minuteStep={minuteStep}
        disabled={disabled || !date}
        aria-invalid={ariaInvalid}
      />
    </div>
  );
};

export default DateTimePicker;
