'use client';

import React, { useMemo, useState } from 'react';

import {
  Card, CardHeader, CardTitle, CardContent,
} from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  CalendarDays, ChevronDown, ChevronUp, ChevronsUpDown,
  Download, SlidersHorizontal, Trash2, Clock, UserRound,
  ClipboardList, Info,
} from 'lucide-react';

/* ──────────────────────────────────────────────────────────────────────────────
  Global tokens + Inter / Inter Fallback
────────────────────────────────────────────────────────────────────────────── */
const GlobalTokens = () => (
  <style>{`
:root{
  --wr-brand:#008CCD;
  --wr-action:#0077FF;
  --wr-text:#111827;
  --wr-muted:#6B7280;
  --wr-surface:#FFFFFF;
  --wr-subtle:#F5F7FA;
  --wr-border:#E5E7EB;
  --wr-borderLight:#EFF0F6;
  --wr-success:#28C76F;
  --wr-warning:#FF9F43;
  --wr-danger:#EA5455;
  --wr-radius:12px;
}
.wr-font{font-family:Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif;}
`}</style>
);

/* ──────────────────────────────────────────────────────────────────────────────
  Tokens
────────────────────────────────────────────────────────────────────────────── */
const TK = {
  border: 'var(--wr-border)',
  borderLight: 'var(--wr-borderLight)',
  text: 'var(--wr-text)',
  muted: 'var(--wr-muted)',
  brand: 'var(--wr-brand)',
  pastel: '#D9EEF8',
  success: 'var(--wr-success)',
  warn: 'var(--wr-warning)',
  danger: 'var(--wr-danger)',
  subtleBg: 'var(--wr-subtle)',
  radius: 'var(--wr-radius)',
};

/* ──────────────────────────────────────────────────────────────────────────────
  Types
────────────────────────────────────────────────────────────────────────────── */
type Priority = 'low'|'medium'|'high';
type Status   = 'not_started'|'in_progress'|'review'|'completed'|'cancelled';

export type TaskRow = {
  id: string;
  title: string;
  status: Status;
  priority: Priority;
  assignee?: { id: string; name: string; avatarUrl?: string };
  due?: string;        // ISO date "YYYY-MM-DD"
  updatedAt?: string;  // ISO datetime
  timeMs?: number;     // optional - time logged / estimate
};

type ColumnKey = 'select'|'title'|'status'|'priority'|'assignee'|'due'|'updatedAt'|'time';

type SortDir = 'asc'|'desc';
type SortSpec = { key: Exclude<ColumnKey,'select'>; dir: SortDir };

const STATUS_LABEL: Record<Status, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  review: 'Under Review',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const PRIORITY_LABEL: Record<Priority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

/* ──────────────────────────────────────────────────────────────────────────────
  Utilities
────────────────────────────────────────────────────────────────────────────── */
const todayISO = () => new Date().toISOString().slice(0, 10);
const yyyymmdd = (d: Date) => d.toISOString().slice(0,10);
const safe = <T,>(v: T | undefined | null, fallback: T) => (v == null ? fallback : v);

const isSameDay = (iso?: string) => (iso ? iso === todayISO() : false);
const isPastDay = (iso?: string) => (iso ? iso < todayISO() : false);

const fmtDate = (iso?: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: '2-digit', year: 'numeric' };
  return new Intl.DateTimeFormat(undefined, opts).format(d);
};
const fmtTime = (ms?: number) => {
  if (!ms || ms <= 0) return '—';
  const h = Math.floor(ms / 3_600_000);
  const m = Math.round((ms % 3_600_000) / 60_000);
  return `${h}h ${m}m`;
};
const fmtAgo = (iso?: string) => {
  if (!iso) return '—';
  const d = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(1, Math.floor((now - d) / 1000));
  if (diff < 60) return `${diff}s ago`;
  const min = Math.floor(diff / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
};

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '');
}

/* Lightweight in-file Avatar (no external import) */
function UserAvatar({ name, src, size = 24 }: { name: string; src?: string; size?: number }) {
  const [err, setErr] = useState(false);
  return (
    <span
      className="inline-flex items-center justify-center rounded-full overflow-hidden border"
      style={{ width: size, height: size, borderColor: TK.border, background: '#EAF6FB', color: TK.brand }}
      aria-label={name}
      title={name}
    >
      {src && !err ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={name}
          width={size}
          height={size}
          onError={() => setErr(true)}
          style={{ objectFit: 'cover', width: '100%', height: '100%' }}
        />
      ) : (
        <span className="font-semibold" style={{ fontSize: Math.max(10, Math.floor(size * 0.42)) }}>
          {getInitials(name)}
        </span>
      )}
    </span>
  );
}

/* Demo rows (only used if you don't pass `rows`) */
function makeDemoRows(n = 40): TaskRow[] {
  const users = [
    { id: 'u1', name: 'Alex Carter' },
    { id: 'u2', name: 'Maya Singh' },
    { id: 'u3', name: 'Diego Ruiz' },
    { id: 'u4', name: 'Jin Park' },
  ];
  const titles = [
    'Write product brief', 'Publish blog post', 'Technical audit', 'Fix 404s',
    'Landing page QA', 'Keyword mapping', 'Update sitemap', 'Competitor scan',
  ];
  const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
  const today = new Date(todayISO());

  return Array.from({ length: n }, (_, i) => {
    const created = new Date(today);
    created.setDate(created.getDate() - Math.floor(Math.random() * 12));
    const due = new Date(created);
    due.setDate(created.getDate() + 1 + Math.floor(Math.random() * 10));
    const st: Status = Math.random() > 0.75 ? 'review'
                    : Math.random() > 0.3  ? 'in_progress'
                    : 'not_started';
    const pr: Priority = Math.random() > 0.6 ? 'high' : Math.random() > 0.4 ? 'medium' : 'low';
    const ass = Math.random() > 0.12 ? pick(users) : undefined;

    // Completed sprinkle
    if (Math.random() > 0.85) {
      return {
        id: `t-${i + 1}`,
        title: pick(titles) + ` #${i + 1}`,
        status: 'completed',
        priority: pr,
        assignee: ass,
        due: yyyymmdd(due),
        updatedAt: new Date(created.getTime() + Math.random() * 86_400_000).toISOString(),
        timeMs: Math.floor(Math.random() * 8) * 60 * 60 * 1000,
      };
    }

    // Cancelled sprinkle
    if (Math.random() > 0.92) {
      return {
        id: `t-${i + 1}`,
        title: pick(titles) + ` #${i + 1}`,
        status: 'cancelled',
        priority: pr,
        assignee: ass,
        due: yyyymmdd(due),
        updatedAt: new Date(created.getTime() + Math.random() * 86_400_000).toISOString(),
        timeMs: Math.floor(Math.random() * 2) * 60 * 60 * 1000,
      };
    }

    return {
      id: `t-${i + 1}`,
      title: pick(titles) + ` #${i + 1}`,
      status: st,
      priority: pr,
      assignee: ass,
      due: yyyymmdd(due),
      updatedAt: new Date(created.getTime() + Math.random() * 3 * 86_400_000).toISOString(),
      timeMs: Math.floor(Math.random() * 6) * 60 * 60 * 1000,
    };
  });
}

/* ──────────────────────────────────────────────────────────────────────────────
  Pills
────────────────────────────────────────────────────────────────────────────── */
const StatusPill = ({ s }: { s: Status }) => {
  const map: Record<Status,string> = {
    not_started: '#CBD5E1',
    in_progress: TK.brand,
    review: TK.warn,
    completed: TK.success,
    cancelled: '#6C757D',
  };
  return (
    <span
      className="inline-flex items-center px-2 py-[2px] rounded-full text-[12px] font-medium"
      style={{ background: `${map[s]}1A`, color: map[s] }}
    >
      {STATUS_LABEL[s]}
    </span>
  );
};

const PriorityPill = ({ p }: { p: Priority }) => {
  const map: Record<Priority,string> = {
    high: TK.danger,
    medium: TK.warn,
    low: '#9AA4B2',
  };
  return (
    <span
      className="inline-flex items-center px-2 py-[2px] rounded-full text-[12px] font-medium"
      style={{ background: `${map[p]}1A`, color: map[p] }}
    >
      {PRIORITY_LABEL[p]}
    </span>
  );
};

/* ──────────────────────────────────────────────────────────────────────────────
  Component
────────────────────────────────────────────────────────────────────────────── */
export default function TasksTableSection({
  rows: rowsProp,
  meId = 'u1',
}: {
  rows?: TaskRow[];
  meId?: string;
}) {
  const rows = useMemo<TaskRow[]>(() => safe(rowsProp, makeDemoRows(80)), [rowsProp]);

  /* Quick chips (Open/Overdue/DueToday/Mine) */
  const [chipOpen, setChipOpen] = useState(false);
  const [chipOverdue, setChipOverdue] = useState(false);
  const [chipToday, setChipToday] = useState(false);
  const [chipMine, setChipMine] = useState(false);

  /* Inline column filters */
  const [qTitle, setQTitle] = useState('');
  const [fStatus, setFStatus] = useState<Status | 'all'>('all');
  const [fPriority, setFPriority] = useState<Priority | 'all'>('all');
  const [fAssignee, setFAssignee] = useState<string | 'all'>('all');
  const [dueFrom, setDueFrom] = useState<string>('');
  const [dueTo, setDueTo] = useState<string>('');

  const clearFilters = () => {
    setQTitle('');
    setFStatus('all');
    setFPriority('all');
    setFAssignee('all');
    setDueFrom('');
    setDueTo('');
    setChipOpen(false);
    setChipOverdue(false);
    setChipToday(false);
    setChipMine(false);
  };

  /* Selection (bulk) */
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const selectedIds = useMemo(() => Object.keys(selected).filter(k => selected[k]), [selected]);
  const anySelected = selectedIds.length > 0;

  /* Column visibility */
  const [visibleCols, setVisibleCols] = useState<Record<ColumnKey, boolean>>({
    select: true, title: true, status: true, priority: true, assignee: true, due: true, updatedAt: true, time: true,
  });

  /* Sorting (multi-sort with Shift+Click) */
  const [sorts, setSorts] = useState<SortSpec[]>([{ key: 'updatedAt', dir: 'desc' }]);
  const toggleSort = (key: SortSpec['key'], e: React.MouseEvent) => {
    setSorts((prev) => {
      const i = prev.findIndex(s => s.key === key);
      if (!e.shiftKey) {
        if (i === -1) return [{ key, dir: 'asc' }];
        const dir = prev[i].dir === 'asc' ? 'desc' : 'asc';
        return [{ key, dir }];
      }
      if (i === -1) return [...prev, { key, dir: 'asc' }];
      const next = [...prev];
      next[i] = { key, dir: next[i].dir === 'asc' ? 'desc' : 'asc' };
      return next;
    });
  };

  /* Unique assignees for filter select */
  const assigneeList = useMemo(() => {
    const map = new Map<string, string>();
    rows.forEach(r => { if (r.assignee) map.set(r.assignee.id, r.assignee.name); });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [rows]);

  /* Inline filters apply first */
  const baseFiltered = useMemo(() => {
    const from = dueFrom ? dueFrom : undefined;
    const to = dueTo ? dueTo : undefined;
    return (rows ?? []).filter(r => {
      if (qTitle && !r.title.toLowerCase().includes(qTitle.toLowerCase())) return false;
      if (fStatus !== 'all' && r.status !== fStatus) return false;
      if (fPriority !== 'all' && r.priority !== fPriority) return false;
      if (fAssignee !== 'all' && (r.assignee?.id ?? '') !== fAssignee) return false;
      if (from && (!r.due || r.due < from)) return false;
      if (to && (!r.due || r.due > to)) return false;
      return true;
    });
  }, [rows, qTitle, fStatus, fPriority, fAssignee, dueFrom, dueTo]);

  /* Chips then narrow further */
  const chipFiltered = useMemo(() => {
    return baseFiltered.filter(r => {
      if (chipOpen && (r.status === 'completed' || r.status === 'cancelled')) return false;
      if (chipOverdue && !(r.status !== 'completed' && isPastDay(r.due))) return false;
      if (chipToday && !(r.status !== 'completed' && isSameDay(r.due))) return false;
      if (chipMine && !(r.assignee?.id === meId)) return false;
      return true;
    });
  }, [baseFiltered, chipOpen, chipOverdue, chipToday, chipMine, meId]);

  /* KPI counts (after inline filters) */
  const counts = useMemo(() => {
    const open = baseFiltered.filter(r => r.status !== 'completed' && r.status !== 'cancelled').length;
    const overdue = baseFiltered.filter(r => r.status !== 'completed' && r.due && isPastDay(r.due)).length;
    const dueToday = baseFiltered.filter(r => r.status !== 'completed' && r.due && isSameDay(r.due)).length;
    const mine = baseFiltered.filter(r => r.assignee?.id === meId).length;
    return { open, overdue, dueToday, mine };
  }, [baseFiltered, meId]);

  /* Sort (multi) */
  const sorted = useMemo(() => {
    const arr = [...chipFiltered];
    const cmp = (a: TaskRow, b: TaskRow, s: SortSpec): number => {
      const ka = a[s.key], kb = b[s.key];
      let av: any = ka, bv: any = kb;
      if (s.key === 'assignee') { av = a.assignee?.name || ''; bv = b.assignee?.name || ''; }
      if (s.key === 'due' || s.key === 'updatedAt') { av = ka || ''; bv = kb || ''; }
      if (s.key === 'priority') {
        const order: Record<Priority, number> = { high: 2, medium: 1, low: 0 };
        av = order[a.priority]; bv = order[b.priority];
      }
      if (s.key === 'status') {
        const order: Record<Status, number> = { completed: 3, review: 2, in_progress: 1, not_started: 0, cancelled: -1 };
        av = order[a.status]; bv = order[b.status];
      }
      if (av === bv) return 0;
      return s.dir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    };
    arr.sort((a, b) => {
      for (const s of sorts) {
        const r = cmp(a, b, s);
        if (r !== 0) return r;
      }
      return 0;
    });
    return arr;
  }, [chipFiltered, sorts]);

  /* Visible ids for header checkbox state */
  const visibleIds = useMemo(() => sorted.map(r => r.id), [sorted]);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selected[id]);
  const someVisibleSelected = visibleIds.some(id => selected[id]) && !allVisibleSelected;

  /* Bulk actions */
  const bulkComplete = () => console.info('Mark complete:', selectedIds);
  const bulkReassign = () => console.info('Reassign:', selectedIds);
  const bulkDue = () => console.info('Change due date:', selectedIds);
  const bulkDelete = () => console.info('Delete:', selectedIds);
  const exportCSV = () => {
    const cols: (keyof TaskRow)[] = ['title', 'status', 'priority', 'due', 'updatedAt'];
    const header = cols.join(',');
    const lines = sorted
      .filter(r => selectedIds.length === 0 || selected[r.id])
      .map(r => cols.map(k => JSON.stringify((r as any)[k] ?? '')).join(','))
      .join('\n');
    const csv = header + '\n' + lines;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = selectedIds.length ? 'tasks-selected.csv' : 'tasks.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  /* Column sticky helpers */
  const stickyStyle = (key: ColumnKey) =>
    key === 'select'
      ? { position: 'sticky' as const, left: 0, zIndex: 30, background: '#fff',
          boxShadow: 'inset -1px 0 0 rgba(0,0,0,0.06)' }
    : key === 'title'
      ? { position: 'sticky' as const, left: 46, zIndex: 20, background: '#fff',
          boxShadow: 'inset -1px 0 0 rgba(0,0,0,0.06)' }
      : {};

  const SortIcon = ({ col }: { col: SortSpec['key'] }) => {
    const i = sorts.findIndex(s => s.key === col);
    if (i === -1) return <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />;
    return sorts[i].dir === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />;
  };

  return (
    <>
      <GlobalTokens />
      <section className="wr-font space-y-3 mt-4">
        <Card className="border w-full" style={{ borderColor: TK.border, borderRadius: TK.radius }}>
          {/* ─ Header: Section title w/ branded icon + Info tooltip + Export ─ */}
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" color="var(--wr-brand)" />
              <CardTitle className="text-lg">Tasks</CardTitle>

              {/* Info tooltip near the title */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 cursor-pointer" color="var(--wr-brand)" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs max-w-[280px]">
                    Table supports multi-sort (Shift+Click headers), inline filters, and quick chips above the header.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Right actions: Export + Columns */}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={exportCSV} className="cursor-pointer">
                <Download className="h-4 w-4 mr-2" /> Export
              </Button>

              <Popover>
                <PopoverTrigger asChild>
                  <button className="h-8 px-3 rounded-full border text-sm inline-flex items-center gap-2 bg-white text-muted-foreground hover:bg-[var(--wr-subtle)] cursor-pointer">
                    <SlidersHorizontal className="h-4 w-4" color="var(--wr-brand)" /> Columns
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-72">
                  <div className="text-sm font-medium mb-2">Show / Hide Columns</div>
                  <ScrollArea className="max-h-[320px] pr-2">
                    <div className="space-y-2">
                      {(['title','status','priority','assignee','due','updatedAt','time'] as ColumnKey[])
                        .map((key) => (
                          <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                            <Checkbox
                              checked={visibleCols[key] !== false}
                              onCheckedChange={(v) => setVisibleCols(s => ({ ...s, [key]: Boolean(v) }))}
                            />
                            <span className="capitalize">{key === 'updatedAt' ? 'Last update' : key}</span>
                          </label>
                        ))}
                    </div>
                  </ScrollArea>
                </PopoverContent>
              </Popover>
            </div>
          </CardHeader>

          {/* ─ Filter chips (ABOVE the table header) ─ */}
          <CardContent className="border-t pt-3" style={{ borderColor: TK.borderLight }}>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-2 h-8 px-3 rounded-full border bg-white text-[12px] hover:bg-[var(--wr-subtle)] cursor-pointer"
                style={{ borderColor: TK.border }}
                onClick={() => window.dispatchEvent(new CustomEvent('wr:tasks:openFilters'))}
                title="Filters"
              >
                <SlidersHorizontal size={14} color="var(--wr-brand)" />
                <span>Filters</span>
              </button>

              {/* Quick chips */}
              <button
                className={`h-8 px-3 rounded-full border text-sm cursor-pointer ${chipOpen ? 'bg-[rgba(0,140,205,0.08)] text-[#008CCD] border-[#008CCD33]' : 'bg-white'}`}
                onClick={() => setChipOpen(v => !v)}
                title="Open = status ≠ Completed/Cancelled"
              >
                Open · {counts.open}
              </button>
              <button
                className={`h-8 px-3 rounded-full border text-sm cursor-pointer ${chipOverdue ? 'bg-[rgba(234,84,85,0.08)] text-[#EA5455] border-[#EA545533]' : 'bg-white'}`}
                onClick={() => setChipOverdue(v => !v)}
                title="Due < today & not Completed"
              >
                Overdue · {counts.overdue}
              </button>
              <button
                className={`h-8 px-3 rounded-full border text-sm cursor-pointer ${chipToday ? 'bg-[rgba(255,159,67,0.08)] text-[#FF9F43] border-[#FF9F4333]' : 'bg-white'}`}
                onClick={() => setChipToday(v => !v)}
                title="Due = today & not Completed"
              >
                Due Today · {counts.dueToday}
              </button>
              <button
                className={`h-8 px-3 rounded-full border text-sm cursor-pointer ${chipMine ? 'bg-[rgba(0,140,205,0.08)] text-[#008CCD] border-[#008CCD33]' : 'bg-white'}`}
                onClick={() => setChipMine(v => !v)}
                title="Assigned to me"
              >
                Assigned to me · {counts.mine}
              </button>
            </div>
          </CardContent>

          {/* ─ Bulk selection bar (just above the table header, appears when selected) ─ */}
          {anySelected && (
            <div
              className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 border-t"
              style={{ borderColor: TK.borderLight, background: '#F0FAFF' }}
            >
              <div className="text-sm" style={{ color: TK.text }}>
                <strong>{selectedIds.length}</strong> selected
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" style={{ background: TK.brand, color: '#fff' }} className="cursor-pointer" onClick={bulkComplete}>
                  Mark complete
                </Button>
                <Button size="sm" variant="outline" className="cursor-pointer" onClick={bulkReassign}>Reassign</Button>
                <Button size="sm" variant="outline" className="cursor-pointer" onClick={bulkDue}>Change Due</Button>
                <Button size="sm" variant="destructive" className="cursor-pointer" onClick={bulkDelete}>
                  <Trash2 className="h-4 w-4 mr-1" /> Delete
                </Button>
              </div>
            </div>
          )}

          {/* ─ Table ─ */}
          <CardContent className="p-0">
            <div className="max-h-[560px] overflow-auto border-t" style={{ borderColor: TK.borderLight }}>
              <Table className="text-sm">
                <TableHeader className="sticky top-0 z-50 bg-white shadow-[0_1px_0_0_rgba(0,0,0,0.08)]">
                  {/* Header labels */}
                  <TableRow>
                    {visibleCols.select !== false && (
                      <TableHead style={{ minWidth: 46, ...stickyStyle('select') }}>
                        <div className="flex items-center justify-center">
                          <Checkbox
                            checked={someVisibleSelected ? 'indeterminate' : allVisibleSelected}
                            onCheckedChange={(v) => {
                              const on = Boolean(v);
                              const patch: Record<string, boolean> = {};
                              visibleIds.forEach(id => (patch[id] = on));
                              setSelected(s => ({ ...s, ...patch }));
                            }}
                            aria-label="Select all visible"
                          />
                        </div>
                      </TableHead>
                    )}

                    {visibleCols.title !== false && (
                      <TableHead style={{ minWidth: 320, ...stickyStyle('title') }}>
                        <HeaderButton label="Title" onClick={(e) => toggleSort('title', e)} orderIndex={sorts.findIndex(s => s.key === 'title')} dir={sorts.find(s => s.key === 'title')?.dir}>
                          <SortIcon col="title" />
                        </HeaderButton>
                      </TableHead>
                    )}
                    {visibleCols.status !== false && (
                      <TableHead style={{ minWidth: 160 }}>
                        <HeaderButton label="Status" onClick={(e) => toggleSort('status', e)} orderIndex={sorts.findIndex(s => s.key === 'status')} dir={sorts.find(s => s.key === 'status')?.dir}>
                          <SortIcon col="status" />
                        </HeaderButton>
                      </TableHead>
                    )}
                    {visibleCols.priority !== false && (
                      <TableHead style={{ minWidth: 140 }}>
                        <HeaderButton label="Priority" onClick={(e) => toggleSort('priority', e)} orderIndex={sorts.findIndex(s => s.key === 'priority')} dir={sorts.find(s => s.key === 'priority')?.dir}>
                          <SortIcon col="priority" />
                        </HeaderButton>
                      </TableHead>
                    )}
                    {visibleCols.assignee !== false && (
                      <TableHead style={{ minWidth: 200 }}>
                        <HeaderButton label="Assignee" onClick={(e) => toggleSort('assignee', e)} orderIndex={sorts.findIndex(s => s.key === 'assignee')} dir={sorts.find(s => s.key === 'assignee')?.dir}>
                          <SortIcon col="assignee" />
                        </HeaderButton>
                      </TableHead>
                    )}
                    {visibleCols.due !== false && (
                      <TableHead style={{ minWidth: 170 }}>
                        <HeaderButton label="Due" onClick={(e) => toggleSort('due', e)} orderIndex={sorts.findIndex(s => s.key === 'due')} dir={sorts.find(s => s.key === 'due')?.dir}>
                          <SortIcon col="due" />
                        </HeaderButton>
                      </TableHead>
                    )}
                    {visibleCols.updatedAt !== false && (
                      <TableHead style={{ minWidth: 170 }}>
                        <HeaderButton label="Last update" onClick={(e) => toggleSort('updatedAt', e)} orderIndex={sorts.findIndex(s => s.key === 'updatedAt')} dir={sorts.find(s => s.key === 'updatedAt')?.dir}>
                          <SortIcon col="updatedAt" />
                        </HeaderButton>
                      </TableHead>
                    )}
                    {visibleCols.time !== false && (
                      <TableHead style={{ minWidth: 120 }}>
                        <HeaderButton label="Time" onClick={(e) => toggleSort('time', e)} orderIndex={sorts.findIndex(s => s.key === 'time')} dir={sorts.find(s => s.key === 'time')?.dir}>
                          <SortIcon col="time" />
                        </HeaderButton>
                      </TableHead>
                    )}
                  </TableRow>

                  {/* Inline Filters Row (inside sticky header) */}
                  <TableRow>
                    {visibleCols.select !== false && (
                      <TableHead style={{ minWidth: 46, ...stickyStyle('select') }} />
                    )}
                    {visibleCols.title !== false && (
                      <TableHead style={{ minWidth: 320, ...stickyStyle('title') }}>
                        <Input
                          value={qTitle}
                          onChange={(e) => setQTitle(e.target.value)}
                          placeholder="Filter title..."
                          className="h-8"
                        />
                      </TableHead>
                    )}
                    {visibleCols.status !== false && (
                      <TableHead style={{ minWidth: 160 }}>
                        <Select value={fStatus} onValueChange={(v) => setFStatus(v as any)}>
                          <SelectTrigger className="h-8 cursor-pointer">
                            <SelectValue placeholder="Status..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="not_started">Not Started</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="review">Under Review</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableHead>
                    )}
                    {visibleCols.priority !== false && (
                      <TableHead style={{ minWidth: 140 }}>
                        <Select value={fPriority} onValueChange={(v) => setFPriority(v as any)}>
                          <SelectTrigger className="h-8 cursor-pointer">
                            <SelectValue placeholder="Priority..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="low">Low</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableHead>
                    )}
                    {visibleCols.assignee !== false && (
                      <TableHead style={{ minWidth: 200 }}>
                        <Select value={fAssignee} onValueChange={(v) => setFAssignee(v as any)}>
                          <SelectTrigger className="h-8 cursor-pointer">
                            <SelectValue placeholder="Assignee..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            {assigneeList.map(u => (
                              <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableHead>
                    )}
                    {visibleCols.due !== false && (
                      <TableHead style={{ minWidth: 170 }}>
                        <div className="flex items-center gap-2">
                          <Input
                            type="date"
                            value={dueFrom}
                            onChange={(e) => setDueFrom(e.target.value)}
                            className="h-8"
                          />
                          <span className="text-muted-foreground">–</span>
                          <Input
                            type="date"
                            value={dueTo}
                            onChange={(e) => setDueTo(e.target.value)}
                            className="h-8"
                          />
                        </div>
                      </TableHead>
                    )}
                    {visibleCols.updatedAt !== false && (
                      <TableHead style={{ minWidth: 170 }}>
                        <div className="flex items-center justify-end">
                          <Button variant="outline" size="sm" onClick={clearFilters} className="cursor-pointer">
                            Clear
                          </Button>
                        </div>
                      </TableHead>
                    )}
                    {visibleCols.time !== false && (<TableHead style={{ minWidth: 120 }} />)}
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {sorted.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8}>
                        <div className="py-14 text-center text-sm text-muted-foreground">
                          <div className="mb-2">No tasks match current filters.</div>
                          <button className="underline cursor-pointer" onClick={clearFilters}>Try clearing filters</button>
                          <span> or widening the range.</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}

                  {sorted.map((row) => {
                    const overdue = row.status !== 'completed' && isPastDay(row.due);
                    const dueToday = row.status !== 'completed' && isSameDay(row.due);
                    return (
                      <TableRow key={row.id} className="hover:bg-[#F5F7FA]">
                        {visibleCols.select !== false && (
                          <TableCell style={stickyStyle('select') as any}>
                            <Checkbox
                              checked={!!selected[row.id]}
                              onCheckedChange={(v) => setSelected(s => ({ ...s, [row.id]: Boolean(v) }))}
                              aria-label={`Select ${row.title}`}
                            />
                          </TableCell>
                        )}

                        {visibleCols.title !== false && (
                          <TableCell style={stickyStyle('title') as any}>
                            <div className="max-w-[520px]">
                              <a className="underline underline-offset-2 cursor-pointer" style={{ color: TK.brand }}>{row.title}</a>
                            </div>
                          </TableCell>
                        )}

                        {visibleCols.status !== false && (
                          <TableCell>
                            <StatusPill s={row.status} />
                          </TableCell>
                        )}

                        {visibleCols.priority !== false && (
                          <TableCell>
                            <PriorityPill p={row.priority} />
                          </TableCell>
                        )}

                        {visibleCols.assignee !== false && (
                          <TableCell>
                            {row.assignee ? (
                              <div className="inline-flex items-center gap-2">
                                <UserAvatar name={row.assignee.name} src={row.assignee.avatarUrl} size={24} />
                                <span>{row.assignee.name}</span>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-muted-foreground">
                                <UserRound className="h-4 w-4" /> Unassigned
                              </span>
                            )}
                          </TableCell>
                        )}

                        {visibleCols.due !== false && (
                          <TableCell>
                            <div className="inline-flex items-center gap-2">
                              <CalendarDays className="h-4 w-4 text-muted-foreground" />
                              <span className={overdue ? 'text-red-600 font-medium' : dueToday ? 'text-amber-600 font-medium' : ''}>
                                {fmtDate(row.due)}
                              </span>
                            </div>
                          </TableCell>
                        )}

                        {visibleCols.updatedAt !== false && (
                          <TableCell>
                            <div className="inline-flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span title={row.updatedAt}>{fmtAgo(row.updatedAt)}</span>
                            </div>
                          </TableCell>
                        )}

                        {visibleCols.time !== false && (
                          <TableCell>{fmtTime(row.timeMs)}</TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </section>
    </>
  );
}

/* ──────────────────────────────────────────────────────────────────────────────
  HeaderButton: label + sort icons + multi-sort order badge
────────────────────────────────────────────────────────────────────────────── */
function HeaderButton({
  label,
  onClick,
  orderIndex,
  dir,
  children,
}: {
  label: string;
  onClick: (e: React.MouseEvent) => void;
  orderIndex: number;
  dir?: SortDir;
  children: React.ReactNode;
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onClick}
            className="inline-flex items-center gap-2 hover:text-foreground relative cursor-pointer"
            aria-label={`Sort by ${label}`}
            title="Click to sort • Shift+Click to add multi-sort"
          >
            <span>{label}</span>
            {children}
            {orderIndex >= 0 && (
              <span
                className="inline-flex items-center justify-center rounded-full text-[10px] ml-1"
                style={{
                  width: 16, height: 16, background: 'var(--wr-subtle)', border: `1px solid ${TK.borderLight}`,
                  color: dir === 'asc' ? TK.brand : TK.text,
                }}
              >
                {orderIndex + 1}
              </span>
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          Click to sort • <strong>Shift+Click</strong> to add multi-sort
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
