"use client";

import * as React from "react";
import PhoneInputLib from "react-phone-number-input";
import es from "react-phone-number-input/locale/es.json";
import { cn } from "@/lib/utils";
import { DEFAULT_PHONE_COUNTRY } from "@/lib/phoneValidation";
import { PhoneCountrySelect } from "@/components/ui/phone-country-select";

const phoneInputFieldClassName =
  "placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground h-full min-w-0 flex-1 border-0 bg-transparent px-2 py-1 text-base shadow-none outline-none md:text-sm focus-visible:ring-0 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50";

const PhoneInputField = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<"input">
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    data-slot="phone-input"
    className={cn(phoneInputFieldClassName, className)}
    {...props}
  />
));
PhoneInputField.displayName = "PhoneInputField";

type PhoneNumberInputProps = {
  id?: string;
  value?: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  "aria-invalid"?: boolean;
  placeholder?: string;
  className?: string;
  defaultCountry?: typeof DEFAULT_PHONE_COUNTRY;
};

export function PhoneNumberInput({
  id,
  value,
  onChange,
  onBlur,
  disabled,
  "aria-invalid": ariaInvalid,
  placeholder = "8888 8888",
  className,
  defaultCountry = DEFAULT_PHONE_COUNTRY,
}: PhoneNumberInputProps) {
  return (
    <PhoneInputLib
      id={id}
      labels={es}
      defaultCountry={defaultCountry}
      international
      countryCallingCodeEditable={false}
      value={value || undefined}
      onChange={(nextValue) => onChange(nextValue ?? "")}
      onBlur={onBlur}
      disabled={disabled}
      placeholder={placeholder}
      inputComponent={PhoneInputField}
      countrySelectComponent={PhoneCountrySelect}
      className={cn(
        "PhoneInput flex h-9 w-full items-center rounded-md border border-input bg-transparent px-2 shadow-xs transition-[color,box-shadow]",
        "focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50",
        ariaInvalid && "border-destructive ring-destructive/20",
        disabled && "pointer-events-none opacity-50",
        className,
      )}
      numberInputProps={{
        "aria-invalid": ariaInvalid,
      }}
    />
  );
}
