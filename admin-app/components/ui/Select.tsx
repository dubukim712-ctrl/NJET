"use client";

import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import {
  useId,
  useEffect,
  useRef,
  useState,
  type ChangeEventHandler,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import { getOptions, type SelectOption } from "./selectOptions";

type SelectPresentationProps = Pick<
  SelectHTMLAttributes<HTMLSelectElement>,
  | "id"
  | "name"
  | "disabled"
  | "required"
  | "form"
  | "autoComplete"
  | "aria-describedby"
  | "aria-invalid"
  | "aria-label"
  | "title"
> & {
  label?: ReactNode;
  helperText?: ReactNode;
  error?: ReactNode;
  leadingIcon?: ReactNode;
  containerClassName?: string;
  className?: string;
  children?: ReactNode;
};

type SingleSelectProps = SelectPresentationProps & {
  multiple?: false;
  value?: string | number;
  defaultValue?: string | number;
  onValueChange?: (value: string) => void;
};

type MultiSelectProps = SelectPresentationProps & {
  multiple: true;
  value?: string | string[];
  defaultValue?: string | string[];
  size?: number;
  onChange?: ChangeEventHandler<HTMLSelectElement>;
};

export type SelectProps = SingleSelectProps | MultiSelectProps;

function NativeMultiSelect(props: MultiSelectProps) {
  const {
    id,
    name,
    label,
    helperText,
    error,
    leadingIcon,
    containerClassName = "",
    className = "",
    children,
    ...selectProps
  } = props;
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const descriptionId = `${selectId}-description`;

  return (
    <div className={`min-w-0 space-y-2 ${containerClassName}`}>
      {label && (
        <label
          htmlFor={selectId}
          className="block text-sm font-medium text-foreground"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {leadingIcon && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-3 text-muted-foreground"
          >
            {leadingIcon}
          </span>
        )}
        <select
          {...selectProps}
          id={selectId}
          name={name}
          multiple
          onChange={props.onChange}
          aria-describedby={
            [
              props["aria-describedby"],
              helperText || error ? descriptionId : "",
            ]
              .filter(Boolean)
              .join(" ") || undefined
          }
          aria-invalid={error ? true : props["aria-invalid"]}
          className={`w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none transition placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 ${
            leadingIcon ? "pl-10" : ""
          } ${error ? "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20" : ""} ${className}`}
        >
          {children}
        </select>
      </div>
      {(helperText || error) && (
        <p
          id={descriptionId}
          className={`text-xs ${error ? "text-destructive" : "text-muted-foreground"}`}
          role={error ? "alert" : undefined}
        >
          {error || helperText}
        </p>
      )}
    </div>
  );
}

function SingleSelect(props: SingleSelectProps) {
  const {
    id,
    name,
    label,
    helperText,
    error,
    leadingIcon,
    containerClassName = "",
    className = "",
    children,
    value,
    defaultValue,
    onValueChange,
    disabled,
    required,
    form,
    autoComplete,
    ...accessibilityProps
  } = props;
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const descriptionId = `${selectId}-description`;
  const options = getOptions(children);
  const emptyOption = options.find((option) => option.value === "");
  const resetValue = String(defaultValue ?? options[0]?.value ?? "");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [portalContainer, setPortalContainer] = useState<HTMLElement>();
  const [uncontrolledValue, setUncontrolledValue] = useState(resetValue);
  const selectedValue = String(value ?? uncontrolledValue);
  const selectedOption = options.find(
    (option) => option.value === selectedValue,
  );
  const internalValue = selectedOption?.internalValue ?? "";

  useEffect(() => {
    const dialog = triggerRef.current?.closest("dialog");
    if (dialog) setPortalContainer(dialog);
  }, []);

  useEffect(() => {
    const associatedForm = form
      ? document.getElementById(form)
      : triggerRef.current?.closest("form");
    if (!(associatedForm instanceof HTMLFormElement)) return;

    const reset = () => setUncontrolledValue(resetValue);
    associatedForm.addEventListener("reset", reset);
    return () => associatedForm.removeEventListener("reset", reset);
  }, [form, resetValue]);

  return (
    <div className={`min-w-0 space-y-2 ${containerClassName}`}>
      <SelectPrimitive.Root
        value={internalValue}
        onValueChange={(nextInternalValue) => {
          const option = options.find(
            (entry) => entry.internalValue === nextInternalValue,
          );
          if (!option) return;
          if (value === undefined) setUncontrolledValue(option.value);
          onValueChange?.(option.value);
        }}
        disabled={disabled}
        required={required}
        form={form}
        autoComplete={autoComplete}
      >
        {label && (
          <label
            htmlFor={selectId}
            className="mb-2 block text-sm font-medium text-foreground"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {leadingIcon && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-muted-foreground"
            >
              {leadingIcon}
            </span>
          )}
          <SelectPrimitive.Trigger
            ref={triggerRef}
            id={selectId}
            aria-describedby={
              [
                accessibilityProps["aria-describedby"],
                helperText || error ? descriptionId : "",
              ]
                .filter(Boolean)
                .join(" ") || undefined
            }
            aria-invalid={error ? true : accessibilityProps["aria-invalid"]}
            aria-label={accessibilityProps["aria-label"]}
            aria-required={required}
            title={accessibilityProps.title}
            className={`flex min-h-10 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-left text-sm text-foreground shadow-sm outline-none transition focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 ${
              leadingIcon ? "pl-10" : ""
            } ${error ? "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20" : ""} ${className}`}
          >
            <span className="min-w-0 flex-1 truncate">
              <SelectPrimitive.Value placeholder={emptyOption?.label} />
            </span>
            <SelectPrimitive.Icon asChild>
              <ChevronDown
                aria-hidden="true"
                className="h-4 w-4 shrink-0 text-muted-foreground"
              />
            </SelectPrimitive.Icon>
          </SelectPrimitive.Trigger>
        </div>
        <SelectPrimitive.Portal container={portalContainer}>
          <SelectPrimitive.Content
            position="popper"
            sideOffset={4}
            align="start"
            collisionPadding={8}
            className="z-[100] max-h-[var(--radix-select-content-available-height)] w-[var(--radix-select-trigger-width)] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-lg"
          >
            <SelectPrimitive.Viewport className="max-h-[var(--radix-select-content-available-height)] overflow-y-auto p-1">
              {options.map((option) => (
                <SelectPrimitive.Item
                  key={option.internalValue}
                  value={option.internalValue}
                  textValue={option.label}
                  disabled={option.disabled}
                  className="relative flex min-h-10 cursor-pointer select-none items-center gap-2 rounded px-3 py-2 text-sm outline-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                >
                  <span
                    aria-hidden="true"
                    className="relative h-4 w-4 shrink-0"
                  >
                    <SelectPrimitive.ItemIndicator className="absolute inset-0">
                      <Check className="h-4 w-4" />
                    </SelectPrimitive.ItemIndicator>
                  </span>
                  <SelectPrimitive.ItemText className="min-w-0 flex-1 whitespace-normal break-words">
                    {option.label}
                  </SelectPrimitive.ItemText>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
      {name && (
        <input
          type="hidden"
          name={name}
          value={selectedOption?.value ?? ""}
          disabled={disabled}
          form={form}
        />
      )}
      {(helperText || error) && (
        <p
          id={descriptionId}
          className={`text-xs ${error ? "text-destructive" : "text-muted-foreground"}`}
          role={error ? "alert" : undefined}
        >
          {error || helperText}
        </p>
      )}
    </div>
  );
}

export function Select(props: SelectProps) {
  return props.multiple ? (
    <NativeMultiSelect {...props} />
  ) : (
    <SingleSelect {...props} />
  );
}
