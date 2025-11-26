"use client"

import React, { useEffect, useMemo, useRef, useState } from "react";
import { GlobalTemplateGalleryDrawer } from "./AllTaskTemplateDrawer";

/** ───────────────────────── Tokens (local, can be bridged to CSS vars) ───────────────────────── */
const TK = {
  brand: "#1090D0",
  brandHover: "#0C7FBF",
  text: "#111827",
  title: "#000000",
  muted: "#6B7280",
  border: "#E5E7EB",
  borderLight: "#EFF0F6",
  focus: "#D2EFFF",
  radius: 8,
  radiusPill: 999,
  shadowSticky: "0 2px 8px rgba(0,0,0,.06)",
};

type UserRole = "admin" | "editor" | "viewer";
type ViewScope = "my" | "shared"; // 'shared' is Phase 2-ready

export type TemplatesHeaderBarProps = {
  role: UserRole;
  viewScope?: ViewScope;
  defaultSearch?: string;
  /** Fired after debounced search change */
  onSearch?: (q: string) => void;
  /** Fired when switching My / Shared */
  onViewChange?: (v: ViewScope) => void;
  /** Open builder drawer (Create) */
  onCreateTemplate?: () => void;
  /** Open upload drawer/modal */
  onUploadTemplate?: () => void;
  /** Optional: announce sticky state to parent for adding safe-area, etc. */
  onStickyChange?: (stuck: boolean) => void;
  /** Storage key namespace (multi-tenant safety) */
  storageNS?: string; // e.g. "wr:templates:"
  className?: string;
};

const storageKey = (ns: string, key: string) => `${ns || "wr:templates:"}${key}`;

/** Safe session helpers to avoid SSR / build-time crashes */
function safeSessionGet(key: string, fallback: string = "") {
  try {
    if (typeof window === "undefined" || !("sessionStorage" in window)) return fallback;
    const v = window.sessionStorage.getItem(key);
    return v ?? fallback;
  } catch {
    return fallback;
  }
}
function safeSessionSet(key: string, value: string) {
  try {
    if (typeof window === "undefined" || !("sessionStorage" in window)) return;
    window.sessionStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

/** Permission gates split for reuse + tests */
export function computePermissions(role: UserRole) {
  const canCreate = role === "admin" || role === "editor";
  const canUpload = role === "admin" || role === "editor";
  return { canCreate, canUpload } as const;
}
export function computeViewLabel(scope: ViewScope) {
  return scope === "my" ? "My Templates" : "Shared with Me";
}

export const TemplatesHeaderBar: React.FC<TemplatesHeaderBarProps> = ({
  role,
  viewScope,
  defaultSearch,
  onSearch,
  onViewChange,
  onCreateTemplate,
  onUploadTemplate,
  onStickyChange,
  storageNS = "wr:templates:",
  className,
}) => {
  const [isGalleryOpen, setGalleryOpen] = useState(false);
  const { canCreate, canUpload } = computePermissions(role);

  // ── Persisted state (session) ─────────────────────────────────────────────
  const [scope, setScope] = useState<ViewScope>(() => {
    const saved = safeSessionGet(storageKey(storageNS, "viewScope")) as ViewScope;
    return (viewScope || saved || "my") as ViewScope;
  });
  const [q, setQ] = useState<string>(() => {
    const saved = safeSessionGet(storageKey(storageNS, "search"));
    return defaultSearch ?? saved ?? "";
  });

  useEffect(() => {
    safeSessionSet(storageKey(storageNS, "viewScope"), scope);
  }, [scope, storageNS]);

  // Debounce search and persist
  const debRef = useRef<number | null>(null);
  useEffect(() => {
    safeSessionSet(storageKey(storageNS, "search"), q);
    if (debRef.current) window.clearTimeout(debRef.current);
    debRef.current = window.setTimeout(() => {
      onSearch?.(q);
      track("templates_header_search", { length: q.length });
    }, 300);
    return () => {
      if (debRef.current) window.clearTimeout(debRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  // Notify parent on external 'viewScope' prop updates
  useEffect(() => {
    if (!viewScope) return;
    setScope(viewScope);
  }, [viewScope]);

  // Sticky shadow state
  const [stuck, setStuck] = useState(false);
  useEffect(() => {
    const onScroll = () => {
      const s = (typeof window !== "undefined" ? window.scrollY : 0) > 4;
      setStuck(s);
      onStickyChange?.(s);
    };
    onScroll();
    if (typeof window !== "undefined") {
      window.addEventListener("scroll", onScroll, { passive: true } as any);
      return () => window.removeEventListener("scroll", onScroll);
    }
    return () => { };
  }, [onStickyChange]);

  // Hotkeys: "/" focus search; Esc clears when empty
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName || "").toLowerCase();
      const isTyping = tag === "input" || tag === "textarea";
      if (e.key === "/" && !isTyping) {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "Escape" && document.activeElement === searchRef.current) {
        if ((searchRef.current?.value || "").length === 0) {
          (document.activeElement as HTMLElement)?.blur();
        } else {
          setQ("");
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const viewLabel = useMemo(() => computeViewLabel(scope), [scope]);

  const handleScopeChange = (v: ViewScope) => {
    setScope(v);
    onViewChange?.(v);
    track("templates_header_view_change", { view_scope: v, role });
  };



  const createDisabledTitle = !canCreate
    ? "You can view templates. Ask an admin to create."
    : undefined;
  const uploadDisabledTitle = !canUpload
    ? "You don’t have permission to upload templates."
    : undefined;

  return (
    <header
      className={`wrTH ${className || ""} ${stuck ? "is-stuck" : ""} mb-3`}
      role="region"
      aria-label="Task Templates header"
    >
      {/* Row 1: Title + view switch */}
      <div className="row row1" aria-label="Header title and scope switch">
        <div className="title" title="Manage, create, upload and apply task templates.">
          <span className="emoji" aria-hidden>

          </span>
          <span>Task Templates</span>
        </div>
      </div>

      {/* Row 2: Search + CTAs */}
      <div className="row row2" aria-label="Search and actions">


        <div className="actions">
          <button
            className={`btn primary ${!canCreate ? "disabled" : ""}`}
            onClick={() => {
              if (!canCreate) return;
              track("templates_header_create_click", { role });
              onCreateTemplate?.();
            }}
            aria-disabled={!canCreate}
            title={createDisabledTitle}
          >
            + Create Template
          </button>

          <button
            className={`btn outline ${!canUpload ? "disabled" : ""}`}
            onClick={() => {
              if (!canUpload) return;
              track("templates_header_upload_click", { role });
              onUploadTemplate?.();
            }}
            aria-disabled={!canUpload}
            title={uploadDisabledTitle}
          >
            + Upload CSV/XLSX
          </button>


                    <button
            className="btn outline"
            onClick={() => setGalleryOpen(true)}
          >
            Import from Template Gallery
          </button>
        </div>
      </div>
      <GlobalTemplateGalleryDrawer
        open={isGalleryOpen}
        onClose={() => setGalleryOpen(false)}
      />
      {/* Styles (scoped to .wrTH) */}
      <style>{`
        .wrTH {
          position: sticky; top: 0; z-index: 10;
          background: #fff; border-bottom: 1px solid ${TK.border};
          font-family: Inter, Inter var, InterVariable;
        }
        .wrTH.is-stuck { box-shadow: ${TK.shadowSticky}; }
        .row { display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 16px; padding: 12px 16px; }
        .row1 { height: 64px; }
        .row2 { padding-top: 0; padding-bottom: 12px; }
        .title { display: inline-flex; align-items: center; gap: 10px; font-weight: 700; font-size: 24px; color: ${TK.title}; }
        .emoji { font-size: 20px; line-height: 1; }
        .scope { display: inline-flex; align-items: center; gap: 8px; }
        .scopeLabel { color: ${TK.muted}; font-size: 14px; }
        .selectWrap { position: relative; }
        .select {
          height: 36px; padding: 0 12px; border-radius: ${TK.radius}px;
          border: 1px solid ${TK.border}; background: #fff; font-size: 14px;
        }
        .select:focus { outline: 2px solid ${TK.focus}; outline-offset: 2px; }
        .selectWrap:hover .menu { display: block; } /* simple hover to reveal */
        .menu {
          display: none; list-style: none; margin: 6px 0 0; padding: 6px;
          position: absolute; right: 0; min-width: 200px;
          background: #fff; border: 1px solid ${TK.border}; border-radius: ${TK.radius}px;
          box-shadow: 0 8px 20px rgba(0,0,0,.08);
        }
        .menuItem {
          width: 100%; text-align: left; border: 0; background: transparent;
          font-size: 14px; padding: 8px 10px; border-radius: 6px; color: ${TK.text};
        }
        .menuItem:hover { background: ${TK.borderLight}; }
        .menuItem.active { font-weight: 600; }

        .searchWrap {
          position: relative; display: flex; align-items: center;
          border: 1px solid ${TK.border}; border-radius: ${TK.radius}px; height: 36px; background: #fff;
        }
        .searchIcon { position: absolute; left: 10px; font-size: 14px; opacity: .8; }
        .search {
          flex: 1; height: 100%; padding: 0 36px 0 28px; font-size: 14px;
          background: transparent; border: 0; color: ${TK.text};
          outline: none;
        }
        .search:focus { box-shadow: 0 0 0 2px ${TK.focus}; border-radius: ${TK.radius}px; }
        .clearBtn {
          position: absolute; right: 6px; height: 28px; min-width: 28px;
          border: 0; background: transparent; border-radius: 6px; cursor: pointer; font-size: 13px;
        }
        .clearBtn:hover { background: ${TK.borderLight}; }

        .actions { display: inline-flex; align-items: center; gap: 8px; }
        .btn {
          height: 36px; padding: 0 12px; border-radius: ${TK.radius}px;
          font-size: 14px; font-weight: 500; cursor: pointer; transition: background .12s ease, border-color .12s ease, opacity .12s ease;
        }
        .btn:focus { outline: 2px solid ${TK.focus}; outline-offset: 2px; }
        .btn.primary { color: #fff; background: ${TK.brand}; border: 1px solid ${TK.brand}; }
        .btn.primary:hover { background: ${TK.brandHover}; border-color: ${TK.brandHover}; }
        .btn.outline { color: ${TK.brand}; background: #fff; border: 1px solid ${TK.brand}; }
        .btn.outline:hover { background: #F3FAFF; }
        .btn.disabled, .btn[aria-disabled="true"] {
          opacity: .5; cursor: not-allowed;
        }

        /* Responsive: stack search + actions under title row on narrow screens */
        @media (max-width: 1024px) {
          .row1 { grid-template-columns: 1fr; height: 56px; }
          .row2 { grid-template-columns: 1fr; gap: 10px; }
          .actions { justify-content: flex-start; }
        }

        /* Dark mode (opt-in via .dark ancestor) */
        :root.dark .wrTH { background: #0f172a; border-color: #333; }
        :root.dark .title { color: #F5F7FA; }
        :root.dark .select, :root.dark .searchWrap { background: #1f2937; border-color: #333; color: #E5E7EB; }
        :root.dark .menu { background: #111827; border-color: #333; }
        :root.dark .menuItem { color: #E5E7EB; }
        :root.dark .menuItem:hover { background: #1f2937; }
        :root.dark .btn.outline { color: #E5E7EB; border-color: #3b82f6; }
        :root.dark .btn.outline:hover { background: rgba(59,130,246,.08); }
      `}</style>
    </header>
  );
};

/** Basic telemetry stub — plug into your analytics layer */
function track(event: string, payload?: Record<string, any>) {
  // Replace with analytics.track(...)
  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.log(`[telemetry] ${event}`, payload || {});
  }
}

/** ───────────────────────── Optional demo wiring (remove in production) ─────────────────────────
 * This shows the header working standalone. Tie onSearch/onViewChange to your data loader.
 */
export const TemplatesHeaderBarDemo: React.FC = ({ setDrawerOpen, setOpen }: any) => {
  const [scope, setScope] = useState<ViewScope>("my");
  const [query, setQuery] = useState("");
  return (
    <div>
      <TemplatesHeaderBar
        role="editor"
        viewScope={scope}
        defaultSearch=""
        onViewChange={(v) => setScope(v)}
        onSearch={setQuery}
        onCreateTemplate={() => setDrawerOpen(true)}
        onUploadTemplate={() => setOpen(true)}
      />

    </div>
  );
};


export default TemplatesHeaderBarDemo;


