'use client';

export const faviconFor = (domainOrUrl: string) => {
  try {
    const host = domainOrUrl.includes("://") ? new URL(domainOrUrl).hostname : domainOrUrl;
    return `https://www.google.com/s2/favicons?sz=32&domain=${encodeURIComponent(host)}`;
  } catch {
    return `https://www.google.com/s2/favicons?sz=32&domain=${encodeURIComponent(domainOrUrl)}`;
  }
};

export function emit(name: string, detail: any) {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(name, { detail }));
}

export function isValidUrl(s: string) {
  try {
    const u = new URL(s);
    return !!u.protocol && !!u.hostname;
  } catch {
    return false;
  }
}

export const cleanTopic = (s: string) =>
  s
    .replace(/\s+/g, " ")
    .replace(/[.?!,:;]+$/g, "")
    .trim();

export const slugify = (s: string, fallback = "ai-writer") =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-") || fallback;

export const escapeHtml = (value?: string) =>
  (value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

export const formatFriendlyDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const OKLCH_SAFE_VARS: Record<string, string> = {
  "--background": "#ffffff",
  "--foreground": "#111827",
  "--card": "#ffffff",
  "--card-foreground": "#111827",
  "--popover": "#ffffff",
  "--popover-foreground": "#111827",
  "--primary": "#008ccd",
  "--primary-foreground": "#ffffff",
  "--secondary": "#f2f5f7",
  "--secondary-foreground": "#1f2937",
  "--muted": "#f2f5f7",
  "--muted-foreground": "#6b7280",
  "--accent": "#f2f5f7",
  "--accent-foreground": "#111827",
  "--destructive": "#dc2626",
  "--border": "rgba(15,23,42,0.08)",
  "--input": "rgba(15,23,42,0.12)",
  "--ring": "#2563eb",
  "--chart-1": "#2563eb",
  "--chart-2": "#14b8a6",
  "--chart-3": "#f97316",
  "--chart-4": "#eab308",
  "--chart-5": "#ec4899",
  "--sidebar": "#ffffff",
  "--sidebar-foreground": "#1f2937",
  "--sidebar-primary": "#008ccd",
  "--sidebar-primary-foreground": "#ffffff",
  "--sidebar-accent": "#f2f5f7",
  "--sidebar-accent-foreground": "#1f2937",
  "--sidebar-border": "rgba(15,23,42,0.08)",
  "--sidebar-ring": "#2563eb",
};

export const applySafeColorOverrides = () => {
  if (typeof document === "undefined") return () => {};
  const root = document.documentElement;
  const prevEntries: Array<[string, string]> = [];
  Object.entries(OKLCH_SAFE_VARS).forEach(([token, value]) => {
    prevEntries.push([token, root.style.getPropertyValue(token)]);
    root.style.setProperty(token, value);
  });
  return () => {
    prevEntries.forEach(([token, prev]) => {
      if (prev) root.style.setProperty(token, prev);
      else root.style.removeProperty(token);
    });
  };
};
