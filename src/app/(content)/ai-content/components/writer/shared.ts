'use client';

import type React from "react";

export const TK = {
  brand: "var(--brand, #008CCD)",
  brand600: "var(--brand-600, #007BB8)",
  onBrand: "var(--on-brand, rgba(255,255,255,0.88))",
  bgApp: "var(--bg-app, #F5F7FA)",
  bgPanel: "var(--bg-panel, #FFFFFF)",
  borderSubtle: "var(--border-subtle, #EFF0F6)",
  border: "var(--border, #E5E7EB)",
  textStrong: "var(--text-strong, #111827)",
  text: "var(--text, #374151)",
  textMuted: "var(--text-muted, #6B7280)",
  success: "var(--success, #34A853)",
  successBg: "var(--success-bg, #CBF8D7)",
  warning: "var(--warning, #F9BB04)",
  warningBg: "var(--warning-bg, #FCEBB8)",
  critical: "var(--critical, #E94134)",
  criticalBg: "var(--critical-bg, #FBC4BF)",
  focus: "var(--focus, #4286F5)",
  overlay: "var(--overlay, rgba(17,24,39,0.96))",
  radius: "var(--radius, 6px)",
  shadow1: "var(--shadow-1, 0 1px 3px rgba(0,0,0,0.1))",
} as const;

export const fontStack: React.CSSProperties = {
  fontFamily:
    'Inter, "Inter Fallback", "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif',
};

export const cn = (...xs: Array<string | false | null | undefined>) => xs.filter(Boolean).join(" ");
export const nf = new Intl.NumberFormat();

export const listItemMotion = {
  initial: { opacity: 0, y: 8, filter: "blur(8px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: { opacity: 0, y: -6, filter: "blur(4px)" },
};

export const cardMotionProps = {
  initial: { opacity: 0, y: 24, filter: "blur(12px)" },
  whileInView: { opacity: 1, y: 0, filter: "blur(0px)" },
  viewport: { once: true, amount: 0.3 },
  transition: { duration: 0.5 },
};
