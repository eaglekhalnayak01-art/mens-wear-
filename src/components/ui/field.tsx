"use client";

import { forwardRef, useId } from "react";
import { cn } from "@/lib/cn";

/**
 * Form controls. Every one of them is a real labelled element (never a
 * placeholder-as-label), reports `aria-invalid`, and points `aria-describedby`
 * at its error/hint so screen readers announce the failure state.
 */

const fieldBase =
  "w-full rounded-[var(--radius-sm)] border bg-paper px-3.5 text-[15px] text-ink placeholder:text-muted/70 " +
  "transition-[border-color,box-shadow] duration-200 outline-none " +
  "focus:border-ink focus:ring-[3px] focus:ring-brass/15 disabled:bg-sand/50 disabled:text-muted";

export type FieldProps = {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  optionalLabel?: boolean;
  className?: string;
  children: React.ReactNode;
  htmlFor?: string;
};

export function Field({ label, hint, error, required, optionalLabel, className, children, htmlFor }: FieldProps) {
  const id = htmlFor ?? useId();
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label ? (
        <label htmlFor={id} className="flex items-baseline justify-between gap-3 text-[12.5px] font-medium tracking-[0.02em] text-ink-soft">
          <span>
            {label}
            {required ? <span className="ml-0.5 text-bad">*</span> : null}
          </span>
          {optionalLabel && !required ? <span className="text-[11px] font-normal text-muted">Optional</span> : null}
        </label>
      ) : null}
      {typeof children === "function" ? (children as (p: { id: string; describedBy?: string }) => React.ReactNode)({ id, describedBy }) : children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="flex items-start gap-1.5 text-[12.5px] leading-snug text-bad">
          <svg viewBox="0 0 20 20" className="mt-[2px] h-3.5 w-3.5 shrink-0" fill="currentColor" aria-hidden="true">
            <path d="M10 1.5 18.5 17H1.5L10 1.5Zm0 5.2a.9.9 0 0 0-.9.95l.2 3.4a.7.7 0 0 0 1.4 0l.2-3.4A.9.9 0 0 0 10 6.7Zm0 6.1a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z" />
          </svg>
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-[12.5px] leading-snug text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean; prefix?: string }>(
  function Input({ className, invalid, prefix, ...rest }, ref) {
    if (prefix) {
      return (
        <div
          className={cn(
            "flex items-center rounded-[var(--radius-sm)] border bg-paper pl-3 transition-[border-color,box-shadow] duration-200 focus-within:border-ink focus-within:ring-[3px] focus-within:ring-brass/15",
            invalid ? "border-bad" : "border-line",
            className,
          )}
        >
          <span className="mr-1 text-[13px] font-medium text-muted">{prefix}</span>
          <input
            ref={ref}
            className="h-11 w-full min-w-0 bg-transparent pr-3 text-[15px] outline-none placeholder:text-muted/70"
            aria-invalid={invalid || undefined}
            {...rest}
          />
        </div>
      );
    }
    return (
      <input
        ref={ref}
        className={cn(fieldBase, "h-11", invalid ? "border-bad focus:border-bad" : "border-line", className)}
        aria-invalid={invalid || undefined}
        {...rest}
      />
    );
  },
);

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(
  function Textarea({ className, invalid, rows = 4, ...rest }, ref) {
    return (
      <textarea
        ref={ref}
        rows={rows}
        className={cn(fieldBase, "resize-y py-2.5 leading-relaxed", invalid ? "border-bad" : "border-line", className)}
        aria-invalid={invalid || undefined}
        {...rest}
      />
    );
  },
);

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }>(
  function Select({ className, invalid, children, ...rest }, ref) {
    return (
      <div className="relative">
        <select
          ref={ref}
          className={cn(
            fieldBase,
            "h-11 cursor-pointer appearance-none pr-9",
            invalid ? "border-bad" : "border-line",
            className,
          )}
          {...rest}
        >
          {children}
        </select>
        <svg viewBox="0 0 12 12" className="pointer-events-none absolute right-3 top-1/2 h-3 w-3 -translate-y-1/2 text-muted" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
          <path d="M2.5 4.5 6 8l3.5-3.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    );
  },
);

export function Checkbox({
  label,
  description,
  className,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & { label: React.ReactNode; description?: string }) {
  const id = useId();
  return (
    <div className={cn("flex items-start gap-2.5", className)}>
      <input
        id={id}
        type="checkbox"
        className="mt-[3px] h-[17px] w-[17px] shrink-0 cursor-pointer appearance-none rounded-[4px] border border-line bg-paper transition-all checked:border-ink checked:bg-ink focus-visible:ring-[3px] focus-visible:ring-brass/20 [&:checked]+:opacity-100"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none' stroke='%23fff' stroke-width='2.2' stroke-linecap='round'%3E%3Cpath d='m3.5 8.4 3 3 6-6.8'/%3E%3C/svg%3E\")",
          backgroundSize: "12px",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
        {...rest}
      />
      <label htmlFor={id} className="cursor-pointer select-none text-[13.5px] leading-snug text-ink-soft">
        {label}
        {description ? <span className="mt-0.5 block text-[12px] text-muted">{description}</span> : null}
      </label>
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-[13.5px] font-medium text-ink">{label}</p>
        {description ? <p className="mt-0.5 text-[12.5px] leading-snug text-muted">{description}</p> : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full border transition-colors duration-200 disabled:opacity-50",
          checked ? "border-ink bg-ink" : "border-line bg-sand",
        )}
      >
        <span
          className={cn(
            "absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-paper shadow-hair transition-[left] duration-200 ease-[cubic-bezier(.22,.61,.36,1)]",
            checked ? "left-[22px]" : "left-[2px]",
          )}
        />
      </button>
    </div>
  );
}

/** Search input with the magnifier baked in (used in header, admin tables). */
export function SearchInput({
  className,
  onClear,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & { onClear?: () => void }) {
  return (
    <div className={cn("relative flex items-center", className)}>
      <svg viewBox="0 0 20 20" className="pointer-events-none absolute left-3 h-4 w-4 text-muted" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
        <circle cx="9" cy="9" r="6" />
        <path d="m13.5 13.5 3 3" strokeLinecap="round" />
      </svg>
      <input
        type="search"
        className={cn(fieldBase, "h-10 border-line pl-9 pr-9 text-[14px]")}
        {...rest}
      />
      {onClear ? (
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear search"
          className="absolute right-2 grid h-6 w-6 place-items-center rounded-full text-muted transition-colors hover:bg-sand hover:text-ink"
        >
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path d="m4 4 8 8M12 4l-8 8" strokeLinecap="round" />
          </svg>
        </button>
      ) : null}
    </div>
  );
}
