'use client';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Single-file, fully functional Explain This Suggestion Modal
 * - Uses React Portal to <body> so it always appears on top
 * - Locks body scroll when open
 * - Includes a demo harness (default export) for instant verification
 *
 * Exports:
 *   - Named:   ExplainSuggestionModal (the reusable component)
 *   - Default: ExplainSuggestionModalDemo (click-to-open demo)
 */

/* ========================== Types ========================== */
type StatusTone = 'info' | 'warning' | 'critical' | 'good';

export type LogicTileType =
  | 'keyword_gap'
  | 'serp_ownership'
  | 'backlink_gap'
  | 'format_gap'
  | 'speed_gap'
  | 'content_length'
  | 'anchor_risk'
  | string;

export interface LogicTile {
  type: LogicTileType;
  icon?: 'kw-gap' | 'star' | 'link' | 'schema' | 'speed' | 'text' | 'anchor' | string;
  label: string;
  value: string;
  status?: StatusTone;
  progress?: number; // 0..1 for microbar
  tooltip?: string;
}

export interface DeepLinkDef {
  label?: string;
  href?: string; // if provided, will open in new tab
  payload?: Record<string, any>;
}

export interface DeepLinks {
  keywords?: DeepLinkDef;
  serp_snapshot?: DeepLinkDef;
  page_audit?: DeepLinkDef;
  backlinks?: DeepLinkDef;
  link_analyzer?: DeepLinkDef;
  [key: string]: DeepLinkDef | undefined;
}

export interface SuggestionPayload {
  suggestion_id: string;
  project_id: string;
  context_id?: string;
  source_panel?: string;
  created_at?: string; // ISO
  recap_text: string;
  logic_tiles: LogicTile[];
  evidence?: { text: string; tooltip?: string }[];
  recommended_actions?: string[];
  deeplinks?: DeepLinks;
  phase3?: { confidence?: number; sources?: Array<{ label: string; href?: string }> };
}

export interface GeneratedTask {
  title: string;
  projectName?: string;
  description: string;
  tags?: string[];
  internalNotes?: string;
  attachments?: { label: string; href?: string; payload?: any }[];
  source?: { suggestion_id: string; context_id?: string; source_panel?: string };
}

interface ExplainSuggestionModalProps {
  open: boolean;
  data: SuggestionPayload;
  onClose: () => void;
  onAddToTask?: (task: GeneratedTask) => void;
  onDeepLink?: (key: string, payload?: any) => void;
  disableAddToTask?: boolean;
  loading?: boolean;
  error?: string | null;
  className?: string;
}

/* ========================== Tokens ========================== */
const TOKENS = {
  brand: '#008CCD',
  brandHover: '#007DB3',
  valueBlue: '#0077FF',
  border: '#EFF0F6',
  chipBg: '#F5F7FA',
  chipHover: '#E5E7EB',
  text: '#111827',
  muted: '#6B7280',
  critical: '#EF4444',
  warning: '#F59E0B',
  good: '#10B981',
  info: '#3B82F6',
} as const;

const statusColorVar = (tone?: StatusTone) => {
  switch (tone) {
    case 'critical':
      return 'var(--wr-critical)';
    case 'warning':
      return 'var(--wr-warning)';
    case 'good':
      return 'var(--wr-good)';
    case 'info':
    default:
      return 'var(--wr-info)';
  }
};

const iconFromType = (type: LogicTileType): LogicTile['icon'] => {
  if (type.includes('keyword')) return 'kw-gap';
  if (type.includes('serp')) return 'star';
  if (type.includes('backlink')) return 'link';
  if (type.includes('format') || type.includes('schema')) return 'schema';
  if (type.includes('speed') || type.includes('lcp')) return 'speed';
  if (type.includes('content')) return 'text';
  if (type.includes('anchor')) return 'anchor';
  return 'text';
};

const fmtDate = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
};

/* ========================== Icons ========================== */
const Icon: React.FC<{ name?: string; className?: string; title?: string }> = ({ name, className, title }) => {
  const c = `w-4 h-4 ${className || ''}`;
  switch (name) {
    case 'kw-gap':
      return (
        <svg className={c} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <title>{title}</title>
          <path d="M4 16h4V8H4v8zm6 0h4V4h-4v12zm6 0h4v-6h-4v6z" fill="currentColor" />
        </svg>
      );
    case 'star':
      return (
        <svg className={c} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <title>{title}</title>
          <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
        </svg>
      );
    case 'link':
      return (
        <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <title>{title}</title>
          <path d="M10.5 13.5l3-3M9 7.5L7.5 9a4.243 4.243 0 000 6 4.243 4.243 0 006 0L15 13.5M9 7.5a4.243 4.243 0 016 0l1.5 1.5M15 13.5l1.5 1.5" />
        </svg>
      );
    case 'schema':
      return (
        <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <title>{title}</title>
          <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
          <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
          <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
          <path d="M10.5 7h3m0 0v3" />
        </svg>
      );
    case 'speed':
      return (
        <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <title>{title}</title>
          <path d="M12 20a8 8 0 100-16 8 8 0 000 16z" />
          <path d="M12 12l4-2" />
        </svg>
      );
    case 'anchor':
      return (
        <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <title>{title}</title>
          <path d="M12 2v20M7 6a5 5 0 0010 0" />
          <path d="M5 18a7 7 0 0014 0" />
        </svg>
      );
    case 'text':
    default:
      return (
        <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <title>{title}</title>
          <path d="M4 6h16M4 12h10M4 18h7" />
        </svg>
      );
  }
};

/* ========================== Logic Tile ========================== */
const LogicTileView: React.FC<{ tile: LogicTile }> = ({ tile }) => {
  const iconName = tile.icon || iconFromType(tile.type);
  const toneVar = statusColorVar(tile.status);
  return (
    <div
      className="group rounded-md border border-[var(--wr-border)] p-3 hover:bg-[var(--wr-chip-bg)] transition-colors"
      role="listitem"
      aria-label={`${tile.label}: ${tile.value}`}
      title={tile.tooltip}
    >
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center justify-center rounded-md bg-[var(--wr-chip-bg)] px-1.5 py-1">
          <Icon name={iconName} className="text-[var(--wr-info)]" />
        </span>
        <span className="text-sm text-[var(--wr-muted)]">{tile.label}</span>
        <span
          className="ml-auto inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs"
          style={{ color: toneVar, borderColor: toneVar }}
          aria-label={tile.status ? `${tile.status} status` : 'status'}
        >
          <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: toneVar }} />
          <span>{tile.status ?? 'info'}</span>
        </span>
      </div>

      <div className="mt-2 text-[15px] font-medium text-[var(--wr-text)]">{tile.value}</div>

      {typeof tile.progress === 'number' && tile.progress >= 0 && tile.progress <= 1 ? (
        <div className="mt-3">
          <div className="h-1.5 w-full overflow-hidden rounded bg-[var(--wr-chip-bg)]">
            <div
              className="h-full rounded bg-[var(--wr-value-blue)] transition-[width]"
              style={{ width: `${Math.round(tile.progress * 100)}%` }}
              aria-hidden="true"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
};

/* ========================== Helpers ========================== */
const getFocusable = (el: HTMLElement | null) =>
  el
    ? (Array.from(
        el.querySelectorAll<HTMLElement>(
          'a[href],area[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),button:not([disabled]),[tabindex]:not([tabindex="-1"])'
        )
      ) as HTMLElement[])
    : [];

/* ========================== Component ========================== */
export const ExplainSuggestionModal: React.FC<ExplainSuggestionModalProps> = ({
  open,
  data,
  onClose,
  onAddToTask,
  onDeepLink,
  disableAddToTask,
  loading,
  error,
  className,
}) => {
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);

  // Ensure portal and body scroll lock
  useEffect(() => {
    setMounted(true);
  }, []);
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // CSS variables (scoped to modal subtree)
  const tokenStyle = useMemo(
    () =>
      ({
        '--wr-brand': TOKENS.brand,
        '--wr-brand-hover': TOKENS.brandHover,
        '--wr-value-blue': TOKENS.valueBlue,
        '--wr-border': TOKENS.border,
        '--wr-chip-bg': TOKENS.chipBg,
        '--wr-chip-hover': TOKENS.chipHover,
        '--wr-text': TOKENS.text,
        '--wr-muted': TOKENS.muted,
        '--wr-critical': TOKENS.critical,
        '--wr-warning': TOKENS.warning,
        '--wr-good': TOKENS.good,
        '--wr-info': TOKENS.info,
      } as React.CSSProperties),
    []
  );

  // Key handlers + focus trap
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'enter') {
        handleAddToTask();
      } else if (e.key === 'Tab') {
        // Focus trap
        const focusables = getFocusable(cardRef.current);
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement as HTMLElement | null;
        if (e.shiftKey) {
          if (active === first || !cardRef.current?.contains(active)) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (active === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]); // eslint-disable-line

  // Initial focus to title
  useEffect(() => {
    if (open && cardRef.current) {
      const h = cardRef.current.querySelector<HTMLElement>('#explain-title');
      h?.focus();
    }
  }, [open]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  const createdDate = fmtDate(data?.created_at);

  const deepLinkItems = useMemo(() => {
    const arr: Array<{ key: string; def: DeepLinkDef }> = [];
    if (data?.deeplinks) {
      for (const [k, v] of Object.entries(data.deeplinks)) {
        if (v) arr.push({ key: k, def: v });
      }
    }
    return arr;
  }, [data]);

  const invokeDeepLink = (key: string, def?: DeepLinkDef) => {
    setMenuOpen(false);
    if (!def) return;
    if (def.href) {
      window.open(def.href, '_blank', 'noopener,noreferrer');
    } else if (onDeepLink) {
      onDeepLink(key, def.payload);
    }
  };

  const handleCopyRecap = useCallback(() => {
    if (!data?.recap_text) return;
    try {
      navigator.clipboard?.writeText(data.recap_text);
    } catch {
      /* no-op */
    }
  }, [data]);

  const handleAddToTask = () => {
    if (!onAddToTask || disableAddToTask) return;
    const recap = data?.recap_text || '';
    const lines = [
      `Suggestion: ${recap}`,
      '',
      'Why This:',
      ...(data?.logic_tiles || []).map((t) => `• ${t.label}: ${t.value} (${t.status ?? 'info'})`),
      '',
      'Supporting Evidence:',
      ...((data?.evidence || []).map((e) => `• ${e.text}`) || []),
    ];
    const attachments: GeneratedTask['attachments'] = deepLinkItems.map(({ key, def }) => ({
      label: def.label || key,
      href: def.href,
      payload: def.payload,
    }));
    onAddToTask({
      title:
        data?.recommended_actions && data.recommended_actions.length > 0
          ? data.recommended_actions[0]
          : recap.slice(0, 90),
      description: lines.join('\n'),
      tags: ['AI‑Suggested'],
      internalNotes: `Created from ExplainSuggestion modal.\nSource: ${data?.source_panel ?? 'Unknown'}\nContext: ${
        data?.context_id ?? '-'
      }`,
      attachments,
      source: {
        suggestion_id: data?.suggestion_id,
        context_id: data?.context_id,
        source_panel: data?.source_panel,
      },
    });
  };

  if (!open) return null;

  const modalNode = (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
      style={tokenStyle}
      aria-hidden={!open}
    >
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="explain-title"
        aria-describedby="explain-recap"
        className={`relative w-full sm:max-w-[680px] bg-white sm:rounded-lg shadow-lg sm:my-8 flex flex-col max-h-[92vh] ${className || ''}`}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start gap-3 border-b border-[var(--wr-border)] bg-white px-5 py-4">
          <div className="mt-0.5">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-[var(--wr-chip-bg)] text-[var(--wr-value-blue)] text-base">
              🧠
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <h2
              id="explain-title"
              tabIndex={-1}
              className="text-base font-semibold text-[var(--wr-text)] focus:outline-none"
            >
              Explain This Suggestion
            </h2>
            <div className="mt-0.5 text-xs text-[var(--wr-muted)]">
              {data?.source_panel ? (
                <span>
                  Source: <span className="font-medium text-[var(--wr-text)]">{data.source_panel}</span>
                </span>
              ) : (
                <span>&nbsp;</span>
              )}
              {createdDate ? <span className="ml-2">• Generated on {createdDate}</span> : null}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-2 rounded-md p-1 text-[var(--wr-muted)] hover:bg-[var(--wr-chip-bg)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--wr-value-blue)]"
            aria-label="Close"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6l-12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="space-y-4">
              <div className="h-4 w-2/3 animate-pulse rounded bg-[var(--wr-chip-bg)]" />
              <div className="h-24 animate-pulse rounded bg-[var(--wr-chip-bg)]" />
              <div className="h-32 animate-pulse rounded bg-[var(--wr-chip-bg)]" />
            </div>
          ) : error ? (
            <div className="rounded-md border border-[var(--wr-border)] bg-red-50 p-4 text-sm text-red-700">
              We couldn’t load the details.{' '}
              <button onClick={() => window.location.reload()} className="underline">
                Retry
              </button>
            </div>
          ) : (
            <>
              {/* 1) Recap */}
              <section aria-labelledby="recap-title" className="mb-5">
                <div className="mb-2 flex items-center justify-between">
                  <h3 id="recap-title" className="text-sm font-medium text-[var(--wr-text)]">
                    Suggestion Recap
                  </h3>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handleCopyRecap}
                      className="rounded-md px-2 py-1 text-xs text-[var(--wr-muted)] hover:bg-[var(--wr-chip-bg)] focus-visible:ring-2 focus-visible:ring-[var(--wr-value-blue)]"
                    >
                      Copy
                    </button>
                    {data?.deeplinks?.keywords ? (
                      <button
                        type="button"
                        onClick={() => invokeDeepLink('keywords', data.deeplinks?.keywords)}
                        className="rounded-md px-2 py-1 text-xs text-[var(--wr-value-blue)] hover:bg-[var(--wr-chip-bg)] focus-visible:ring-2 focus-visible:ring-[var(--wr-value-blue)]"
                      >
                        View Keywords
                      </button>
                    ) : null}
                  </div>
                </div>

                <div
                  id="explain-recap"
                  className="flex items-start gap-2 rounded-md border border-[var(--wr-border)] bg-white p-3 shadow-sm"
                >
                  <span className="mt-0.5">🔥</span>
                  <p className="text-[15px] leading-snug text-[var(--wr-text)]">{data?.recap_text || '—'}</p>
                </div>
              </section>

              {/* 2) Why This Suggestion */}
              <section aria-labelledby="why-title" className="mb-5">
                <h3 id="why-title" className="mb-2 text-sm font-medium text-[var(--wr-text)]">
                  Why This Suggestion?
                </h3>
                {data?.logic_tiles?.length ? (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {data.logic_tiles.map((tile, i) => (
                      <LogicTileView key={`${tile.type}-${i}`} tile={tile} />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-md border border-[var(--wr-border)] bg-[var(--wr-chip-bg)] p-3 text-sm text-[var(--wr-muted)]">
                    No specific triggers available for this suggestion.
                  </div>
                )}
              </section>

              {/* 3) Supporting Evidence */}
              {data?.evidence && data.evidence.length > 0 ? (
                <section className="mb-5">
                  <button
                    type="button"
                    onClick={() => setEvidenceOpen((s) => !s)}
                    className="flex w-full items-center justify-between rounded-md border border-[var(--wr-border)] bg-white px-3 py-2 text-left hover:bg-[var(--wr-chip-bg)] focus-visible:ring-2 focus-visible:ring-[var(--wr-value-blue)]"
                    aria-expanded={evidenceOpen}
                    aria-controls="evidence-panel"
                  >
                    <span className="text-sm font-medium text-[var(--wr-text)]">Supporting Evidence</span>
                    <svg
                      className={`h-4 w-4 text-[var(--wr-muted)] transition-transform ${
                        evidenceOpen ? 'rotate-180' : ''
                      }`}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden="true"
                    >
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </button>
                  {evidenceOpen ? (
                    <div id="evidence-panel" className="mt-2 rounded-md border border-[var(--wr-border)] p-3">
                      <ul className="list-inside list-disc space-y-1">
                        {data.evidence.slice(0, 6).map((ev, i) => (
                          <li key={i} className="text-sm text-[var(--wr-text)]" title={ev.tooltip}>
                            {ev.text}
                          </li>
                        ))}
                      </ul>
                      {data.phase3?.confidence !== undefined ? (
                        <div className="mt-3 flex items-center gap-2 text-xs text-[var(--wr-muted)]">
                          <span>Confidence:</span>
                          <div className="h-1.5 w-24 overflow-hidden rounded bg-[var(--wr-chip-bg)]">
                            <div
                              className="h-full bg-[var(--wr-good)]"
                              style={{ width: `${Math.round((data.phase3.confidence || 0) * 100)}%` }}
                            />
                          </div>
                          <span>{Math.round((data.phase3.confidence || 0) * 100)}%</span>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </section>
              ) : null}

              {/* 4) Recommended Action */}
              <section aria-labelledby="action-title" className="mb-2">
                <h3 id="action-title" className="mb-2 text-sm font-medium text-[var(--wr-text)]">
                  Recommended Action
                </h3>
                <div className="rounded-md border border-[var(--wr-border)] p-3">
                  {data?.recommended_actions?.length ? (
                    <ul className="list-inside list-disc space-y-1">
                      {data.recommended_actions.slice(0, 3).map((a, i) => (
                        <li key={i} className="text-sm text-[var(--wr-text)]">
                          {a}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-[var(--wr-muted)]">No explicit actions were provided.</p>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {data?.deeplinks?.serp_snapshot ? (
                      <button
                        type="button"
                        onClick={() => invokeDeepLink('serp_snapshot', data.deeplinks?.serp_snapshot)}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm text-[var(--wr-value-blue)] hover:bg-[var(--wr-chip-bg)] focus-visible:ring-2 focus-visible:ring-[var(--wr-value-blue)]"
                      >
                        View SERP Snapshot
                      </button>
                    ) : null}
                    {data?.deeplinks?.page_audit ? (
                      <button
                        type="button"
                        onClick={() => invokeDeepLink('page_audit', data.deeplinks?.page_audit)}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm text-[var(--wr-value-blue)] hover:bg-[var(--wr-chip-bg)] focus-visible:ring-2 focus-visible:ring-[var(--wr-value-blue)]"
                      >
                        Analyze Full Page Audit
                      </button>
                    ) : null}
                    {data?.deeplinks?.backlinks ? (
                      <button
                        type="button"
                        onClick={() => invokeDeepLink('backlinks', data.deeplinks?.backlinks)}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm text-[var(--wr-value-blue)] hover:bg-[var(--wr-chip-bg)] focus-visible:ring-2 focus-visible:ring-[var(--wr-value-blue)]"
                      >
                        Open Backlink Opportunities
                      </button>
                    ) : null}
                  </div>
                </div>
              </section>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-t border-[var(--wr-border)] bg-white px-5 py-3">
          <div className="order-2 sm:order-1 flex items-center gap-2">
            <button
              type="button"
              onClick={handleAddToTask}
              disabled={!!disableAddToTask}
              className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-white focus-visible:ring-2 focus-visible:ring-[var(--wr-value-blue)] ${
                disableAddToTask
                  ? 'bg-[var(--wr-chip-hover)] cursor-not-allowed'
                  : 'bg-[var(--wr-brand)] hover:bg-[var(--wr-brand-hover)]'
              }`}
            >
              Add to Task
            </button>

            {deepLinkItems.length > 0 ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMenuOpen((s) => !s)}
                  className="inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm text-[var(--wr-value-blue)] hover:bg-[var(--wr-chip-bg)] focus-visible:ring-2 focus-visible:ring-[var(--wr-value-blue)]"
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                >
                  Open Related Data
                  <svg
                    className={`h-4 w-4 transition-transform ${menuOpen ? 'rotate-180' : ''}`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
                {menuOpen ? (
                  <div
                    role="menu"
                    className="absolute left-0 mt-1 min-w-[220px] overflow-hidden rounded-md border border-[var(--wr-border)] bg-white shadow-lg"
                  >
                    {deepLinkItems.map(({ key, def }, idx) => (
                      <button
                        key={key + idx}
                        role="menuitem"
                        type="button"
                        onClick={() => invokeDeepLink(key, def)}
                        className="block w-full text-left px-3 py-2 text-sm text-[var(--wr-text)] hover:bg-[var(--wr-chip-bg)]"
                      >
                        {def.label || key}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="order-1 sm:order-2">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-md px-3 py-2 text-sm text-[var(--wr-muted)] hover:bg-[var(--wr-chip-bg)] focus-visible:ring-2 focus-visible:ring-[var(--wr-value-blue)]"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Render via portal to body to avoid stacking/overflow issues
  if (mounted && typeof document !== 'undefined') {
    return createPortal(modalNode, document.body);
  }
  // Fallback (SSR hydration); will be replaced on mount
  return modalNode;
};

/* ========================== Demo Harness ========================== */
/**
 * Default export: a minimal harness to verify rendering immediately.
 * Drop this component into any page and click "Open Explain Modal".
 * In production, import the named ExplainSuggestionModal instead.
 */
const examplePayload: SuggestionPayload = {
  suggestion_id: 'sgg_abc123',
  project_id: 'prj_001',
  context_id: 'page:/ai-guide',
  source_panel: 'Keywords › Opportunities',
  created_at: new Date().toISOString(),
  recap_text: 'You can target Featured Snippets on 6 keywords currently owned by comp1.com',
  logic_tiles: [
    { type: 'keyword_gap', label: 'Positions', value: '6/6 in #4–7', status: 'info', progress: 1, tooltip: 'Snippet-snipe band (4–8)' },
    { type: 'serp_ownership', label: 'FS owner', value: 'comp1.com', status: 'warning' },
    { type: 'format_gap', label: 'Schema', value: 'No FAQ detected', status: 'warning' },
    { type: 'backlink_gap', label: 'Ref domains', value: '14 to competitor only', status: 'info', progress: 0.65 },
  ],
  evidence: [
    { text: 'Avg rank = 6.2 across 6 FS queries' },
    { text: 'Competitor uses H2–QA structure on target page' },
    { text: 'FS/PAA visible in 3 countries' },
  ],
  recommended_actions: ['Add H2 question blocks with short answers', 'Add FAQ Schema and a summary table above the fold'],
  deeplinks: {
    keywords: { label: 'Keywords (filtered)', payload: { suggestion_id: 'sgg_abc123' } },
    serp_snapshot: { label: 'SERP Snapshot', payload: { keywords: ['kw1', 'kw2'] } },
    page_audit: { label: 'Analyze Full Page Audit', payload: { url: '/ai-guide' } },
  },
};

export default function ExplainSuggestionModalDemo({onClose}:{onClose: () => void;}) {
  const [open, setOpen] = useState(true);
  const [lastTask, setLastTask] = useState<GeneratedTask | null>(null);

  return (
    <>
      <ExplainSuggestionModal
        open={open}
        data={examplePayload}
        onClose={onClose}
        onAddToTask={(task) => {
          setLastTask(task);
          alert(`Task created:\n\n${task.title}\n\n${task.description.substring(0, 160)}…`);
        }}
        onDeepLink={(key, payload) => {
          alert(`Deep link invoked: ${key}\nPayload: ${JSON.stringify(payload, null, 2)}`);
        }}
      />
    </>
  );
}
