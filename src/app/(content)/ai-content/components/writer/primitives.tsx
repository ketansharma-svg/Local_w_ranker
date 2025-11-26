'use client';

import React, { useState } from "react";
import { ListChecks, X } from "lucide-react";
import { TK, cn } from "./shared";
import { motion } from "framer-motion";

export function PrimaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className, style, disabled, ...rest } = props;
  return (
    <button
      {...rest}
      disabled={disabled}
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium",
        "transition-colors hover:brightness-95 focus-visible:outline",
        disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer",
        className
      )}
      style={{ background: TK.brand, color: TK.onBrand, outlineColor: TK.focus, ...style }}
    />
  );
}

export function SecondaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className, style, disabled, ...rest } = props;
  return (
    <button
      {...rest}
      disabled={disabled}
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm",
        "transition-colors hover:bg-[color:var(--bg-app,#F5F7FA)] focus-visible:outline",
        disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer",
        className
      )}
      style={{ borderColor: TK.border, color: TK.text, outlineColor: TK.focus, background: TK.bgPanel, ...style }}
    />
  );
}

export function GhostButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className, style, disabled, ...rest } = props;
  return (
    <button
      {...rest}
      disabled={disabled}
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-md px-2 text-sm",
        "transition-colors hover:bg-[color:var(--bg-app,#F5F7FA)]",
        disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer",
        className
      )}
      style={{ color: TK.text, background: "transparent", ...style }}
    />
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: T;
  options: { value: T; label: string; Icon?: React.ComponentType<any> }[];
  onChange: (v: T) => void;
  ariaLabel?: string;
}) {
  return (
    <div
      className="inline-flex overflow-hidden rounded-[999px] border flex-wrap"
      style={{ borderColor: TK.border }}
      role="tablist"
      aria-label={ariaLabel}
    >
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          className={cn(
            "px-3 py-2 text-sm transition-colors focus-visible:outline cursor-pointer",
            value === o.value ? "bg-[color:var(--bg-app,#F5F7FA)] font-semibold" : ""
          )}
          style={{ outlineColor: TK.focus }}
          onClick={() => onChange(o.value)}
        >
          <span className="inline-flex items-center gap-2">
            {o.Icon ? <o.Icon size={14} style={{ color: TK.brand }} /> : null}
            {o.label}
          </span>
        </button>
      ))}
    </div>
  );
}

export function ToggleSwitch({
  checked,
  onChange,
  id,
  label,
}: {
  checked: boolean;
  onChange: (c: boolean) => void;
  id: string;
  label: string;
}) {
  return (
    <div className="inline-flex items-center gap-2">
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="relative inline-flex h-[22px] w-10 items-center rounded-full border transition-colors focus-visible:outline"
        style={{
          borderColor: TK.border,
          background: checked ? TK.brand : TK.bgPanel,
          outlineColor: TK.focus,
          cursor: "pointer",
        }}
      >
        <span
          className={cn(
            "absolute left-[2px] h-[18px] w-[18px] rounded-full transition-all",
            checked ? "translate-x-[18px]" : ""
          )}
          style={{ background: checked ? TK.onBrand : TK.borderSubtle, boxShadow: TK.shadow1 }}
        />
      </button>
      <label htmlFor={id} className="text-sm cursor-pointer" style={{ color: TK.text }}>
        {label}
      </label>
    </div>
  );
}

export const PulseBlock = ({ className }: { className?: string }) => (
  <div className={cn("h-3 w-full animate-pulse rounded-md bg-slate-200/70", className)} style={{ filter: "blur(0.45px)" }} />
);

export const ErrorBanner = ({ message }: { message: string }) => (
  <motion.div
    className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 shadow-sm"
    initial={{ opacity: 0, y: 8, filter: "blur(6px)" }}
    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
    exit={{ opacity: 0, y: -6, filter: "blur(4px)" }}
    transition={{ duration: 0.3 }}
  >
    {message}
  </motion.div>
);

export function FieldGroup({ title, children }: React.PropsWithChildren<{ title: string }>) {
  return (
    <div className="rounded-md border p-3" style={{ borderColor: TK.borderSubtle, background: TK.bgPanel }}>
      <div className="mb-2 inline-flex items-center gap-2" title={title}>
        <ListChecks size={16} style={{ color: TK.brand }} />
        <div className="text-[12px] font-semibold uppercase tracking-wide text-black">
          {title}
        </div>
      </div>
      <div className="grid gap-3">{children}</div>
    </div>
  );
}

export function ChipInput({
  label,
  placeholder,
  value,
  onChange,
  max = 25,
}: {
  label: string;
  placeholder?: string;
  value: string[];
  onChange: (xs: string[]) => void;
  max?: number;
}) {
  const [q, setQ] = useState("");
  const add = (raw: string) => {
    const cleaned = raw
      .split(/[,\n]/)
      .map((x) => x.trim())
      .filter(Boolean);
    if (!cleaned.length) return;
    const next = Array.from(new Set([...value, ...cleaned])).slice(0, max);
    onChange(next);
    setQ("");
  };
  return (
    <div>
      <div className="mb-1 text-[12px]" style={{ color: TK.textMuted }}>
        {label}
      </div>
      <div className="flex min-h-[42px] flex-wrap items-center gap-2 rounded-md border px-2 py-2" style={{ borderColor: TK.border }}>
        {value.map((v) => (
          <span key={v} className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs" style={{ borderColor: TK.border, color: TK.text }}>
            {v}
            <button className="cursor-pointer" onClick={() => onChange(value.filter((x) => x !== v))} aria-label={`Remove ${v}`}>
              <X size={14} />
            </button>
          </span>
        ))}
        <input
          className="flex-1 min-w-[120px] outline-none text-sm"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add(q);
            } else if (e.key === "Backspace" && !q && value.length) {
              onChange(value.slice(0, -1));
            }
          }}
          placeholder={placeholder}
        />
      </div>
      <div className="mt-1 text-[12px]" style={{ color: TK.textMuted }}>
        Up to {max} keywords. Duplicates auto-removed.
      </div>
    </div>
  );
}

export function LabeledInput({
  label,
  value,
  onChange,
  required,
  placeholder,
  error,
  maxLen,
  sanitize = "onBlur",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  placeholder?: string;
  error?: string | null;
  maxLen?: number;
  sanitize?: "onBlur" | "none";
}) {
  const isEmpty = !value?.trim();
  return (
    <div>
      <div className="mb-1 text-[12px]" style={{ color: isEmpty ? TK.critical : TK.textMuted }}>
        {label} {required ? <span>(required)</span> : null}
      </div>
      <input
        className="h-10 w-full rounded-md border px-3 text-sm transition-colors outline-none focus-visible:outline"
        style={{ borderColor: error ? TK.critical : TK.border, outlineColor: TK.focus }}
        value={value}
        maxLength={maxLen}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => {
          if (sanitize === "onBlur") onChange(e.target.value.trim().replace(/\s+/g, " ").replace(/[.?!,:;]+$/g, ""));
        }}
        placeholder={placeholder}
      />
      {error ? (
        <div className="mt-1 text-[12px]" style={{ color: TK.critical }}>
          {error}
        </div>
      ) : null}
    </div>
  );
}
