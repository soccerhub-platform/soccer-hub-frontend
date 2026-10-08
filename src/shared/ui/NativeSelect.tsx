import React, { useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./shadcn/Select";

const EMPTY_VALUE = "__soccerhub_empty_select_value__";

type OptionItem = {
  key: React.Key;
  value: string;
  label: React.ReactNode;
  disabled?: boolean;
};

const collectOptions = (children: React.ReactNode, prefix = "option"): OptionItem[] => {
  const result: OptionItem[] = [];

  React.Children.forEach(children, (child, index) => {
    if (!React.isValidElement(child)) return;
    const childProps = child.props as { value?: string | number; disabled?: boolean; children?: React.ReactNode };

    if (child.type === "option") {
      result.push({
        key: child.key ?? `${prefix}-${index}`,
        value: String(childProps.value ?? childProps.children ?? ""),
        label: childProps.children,
        disabled: childProps.disabled,
      });
      return;
    }

    result.push(...collectOptions(childProps.children, `${prefix}-${index}`));
  });

  return result;
};

type NativeSelectProps = Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "value" | "defaultValue" | "onChange" | "size"> & {
  value?: string | number;
  defaultValue?: string | number;
  onChange?: React.ChangeEventHandler<HTMLSelectElement>;
};

const NativeSelect = React.forwardRef<HTMLButtonElement, NativeSelectProps>(({
  children,
  value: controlledValue,
  defaultValue = "",
  onChange,
  className,
  disabled,
  required,
  name,
  id,
  "aria-label": ariaLabel,
  "aria-invalid": ariaInvalid,
  onBlur,
  ...props
}, ref) => {
  const [uncontrolledValue, setUncontrolledValue] = useState(String(defaultValue));
  const options = useMemo(() => collectOptions(children), [children]);
  const value = controlledValue === undefined ? uncontrolledValue : String(controlledValue);
  const placeholder = options.find((option) => option.value === "")?.label ?? "Выберите значение";
  const selectedLabel = options.find((option) => option.value === value)?.label ?? placeholder;

  const changeValue = (nextValue: string) => {
    const resolvedValue = nextValue === EMPTY_VALUE ? "" : nextValue;
    if (controlledValue === undefined) setUncontrolledValue(resolvedValue);
    if (onChange) {
      const target = { value: resolvedValue, name } as HTMLSelectElement;
      onChange({ target, currentTarget: target } as React.ChangeEvent<HTMLSelectElement>);
    }
  };

  return (
    <Select
      value={value === "" ? EMPTY_VALUE : value}
      onValueChange={changeValue}
      disabled={disabled}
      required={required}
      name={name}
    >
      <SelectTrigger
        ref={ref}
        id={id}
        aria-label={ariaLabel}
        aria-invalid={ariaInvalid}
        className={className}
        onBlur={onBlur as React.FocusEventHandler<HTMLButtonElement> | undefined}
        {...(props as unknown as React.ButtonHTMLAttributes<HTMLButtonElement>)}
      >
        <SelectValue placeholder={placeholder}>{selectedLabel}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {options.map((option) => (
            <SelectItem
              key={option.key}
              value={option.value === "" ? EMPTY_VALUE : option.value}
              disabled={option.disabled}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
});
NativeSelect.displayName = "NativeSelect";

export default NativeSelect;
