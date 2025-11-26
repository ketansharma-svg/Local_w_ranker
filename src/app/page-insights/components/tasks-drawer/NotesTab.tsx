"use client";

import React, { useMemo, useRef, useState } from "react";
import {
  NotebookPen,
  Filter as FilterIcon,
  Info,
  Paperclip,
  Pin,
  PinOff,
  Trash2,
  Edit2,
  Save,
  X,
  Copy,
  AtSign,
  Send,
  ThumbsUp,
  Sparkles,
  Heart,
  Hand,
  Eye,
  File as FileIcon,
} from "lucide-react";

/* ──────────────────────────────────────────────────────────────────────────────
   Global Tokens + Inter / Inter Fallback  (align with recent designs)
────────────────────────────────────────────────────────────────────────────── */
const GlobalTokens = () => (
  <style>{`
:root{
  --wr-brand:#008CCD;
  --wr-brand-600:#077FB1;
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
  --wr-shadow-sm:0 1px 2px rgba(17,24,39,.06);
  --wr-shadow-md:0 2px 8px rgba(17,24,39,.08);
}
.wr-font{font-family:Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif;}
`}</style>
);

const TK = {
  brand: "var(--wr-brand)",
  brand600: "var(--wr-brand-600)",
  text: "var(--wr-text)",
  muted: "var(--wr-muted)",
  surface: "var(--wr-surface)",
  subtle: "var(--wr-subtle)",
  border: "var(--wr-border)",
  borderLight: "var(--wr-borderLight)",
  success: "var(--wr-success)",
  warning: "var(--wr-warning)",
  danger: "var(--wr-danger)",
  radius: "var(--wr-radius)",
};

/* ──────────────────────────────────────────────────────────────────────────────
   Types
────────────────────────────────────────────────────────────────────────────── */
export type Role = "viewer" | "editor" | "admin";

export type User = {
  id: string;
  name: string;
  avatarUrl?: string;
  email?: string;
};

export type Attachment = {
  id: string;
  name: string;
  size?: number;
  mime?: string;
  url?: string;
};

export type Note = {
  id: string;
  author: User;
  createdAt: string; // ISO
  updatedAt?: string; // ISO
  bodyMd: string;
  tags?: string[];
  attachments?: Attachment[];
  reactions?: Record<string, string[]>; // keys remain (e.g., "👍") but UI renders icons (no emoji display)
  pinned?: boolean;
  internal?: boolean;
};

export type NotesTabProps = {
  me: User;
  users: User[];
  initialNotes?: Note[];
  role?: Role;
  searchTerm?: string;
  onChange?: (notes: Note[]) => void;
};

/* ──────────────────────────────────────────────────────────────────────────────
   Utils
────────────────────────────────────────────────────────────────────────────── */
const uid = () => Math.random().toString(36).slice(2, 10);

const formatTime = (iso: string) => {
  const d = new Date(iso);
  const now = new Date();
  const diff = (now.getTime() - d.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleString();
};

const prettySize = (bytes?: number) => {
  if (!bytes && bytes !== 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
};

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[ch] as string));

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Mentions syntax stored as: @[Display Name](user:<id>)
const renderMentions = (text: string) =>
  text.replace(/@\[(.+?)\]\(user:([\w-]+)\)/g, (_m, name) => `<span class="mention">@${escapeHtml(name)}</span>`);

// Tiny markdown (bold, italic, code, links, bullets) + search <mark>
function mdToHtml(md: string, search?: string) {
  let html = escapeHtml(md);

  // bullets
  const lines = html.split(/\r?\n/);
  let ul = false,
    out: string[] = [];
  for (const ln of lines) {
    if (/^\s*-\s+/.test(ln)) {
      if (!ul) {
        ul = true;
        out.push("<ul class='list-disc pl-6 my-2'>");
      }
      out.push(`<li>${ln.replace(/^\s*-\s+/, "")}</li>`);
    } else {
      if (ul) {
        ul = false;
        out.push("</ul>");
      }
      out.push(ln);
    }
  }
  if (ul) out.push("</ul>");
  html = out.join("\n");

  // inline formatting
  html = html
    .replace(/`([^`]+)`/g, (_m, code) => `<code class="px-1 rounded bg-gray-100">${code}</code>`)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      `<a href="$2" target="_blank" rel="noreferrer" class="underline" style="color:var(--wr-brand)">$1</a>`
    );

  // mentions
  html = renderMentions(html);

  // paragraphs
  html = html
    .split(/\n{2,}/)
    .map(p => `<p class="my-2 break-words">${p}</p>`)
    .join("");

  // highlight search (outside tags)
  if (search && search.trim().length > 0) {
    const re = new RegExp(`(${escapeRegExp(search)})`, "ig");
    html = html
      .split(/(<[^>]+>)/g)
      .map(chunk => (chunk.startsWith("<") ? chunk : chunk.replace(re, `<mark class="bg-yellow-200">$1</mark>`)))
      .join("");
  }
  return html;
}

/* ──────────────────────────────────────────────────────────────────────────────
   Micro components (Avatar, Chips, IconButton, Attachments, Reactions)
────────────────────────────────────────────────────────────────────────────── */
function AvatarImg({ user, size = 28 }: { user: User; size?: number }) {
  const initials = user.name
    .split(" ")
    .map(p => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span
      className="inline-flex items-center justify-center rounded-full overflow-hidden border"
      style={{ width: size, height: size, borderColor: TK.border, background: "#EAF6FB", color: TK.brand }}
      title={user.name}
      aria-label={user.name}
    >
      {user.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
      ) : (
        <span className="font-semibold" style={{ fontSize: Math.max(10, Math.floor(size * 0.42)) }}>
          {initials}
        </span>
      )}
    </span>
  );
}

function Chip({
  children,
  icon,
  tone = "default",
  className = "",
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
  tone?: "default" | "brand" | "muted";
  className?: string;
}) {
  const styles =
    tone === "brand"
      ? { bg: "#EAF5FD", border: "#D2EFFF", color: TK.brand }
      : tone === "muted"
      ? { bg: "#F1F5F9", border: "#E2E8F0", color: "#334155" }
      : { bg: "#FFFFFF", border: TK.border, color: TK.muted };
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[12px] border ${className}`}
      style={{ background: styles.bg, borderColor: styles.border, color: styles.color as string }}
    >
      {icon}
      {children}
    </span>
  );
}

function FilterChip({
  active,
  onClick,
  children,
  leading,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  leading?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`h-8 px-3 rounded-full border text-sm inline-flex items-center gap-2 cursor-pointer transition ${
        active
          ? "bg-[rgba(0,140,205,0.08)] text-[color:var(--wr-brand)]"
          : "bg-white text-[color:var(--wr-text)] hover:bg-[var(--wr-subtle)]"
      }`}
      style={{ borderColor: active ? "#A9DFF2" : TK.border }}
      type="button"
    >
      {leading}
      {children}
    </button>
  );
}

function IconButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className = "", style, ...rest } = props;
  return (
    <button
      {...rest}
      className={`h-8 w-8 inline-flex items-center justify-center rounded-md border cursor-pointer hover:bg-[var(--wr-subtle)] ${className}`}
      style={{ ...(style || {}), borderColor: TK.border }}
      type="button"
    />
  );
}

function AttachmentPreview({ a, onRemove }: { a: Attachment; onRemove?: () => void }) {
  const isImg = a.mime?.startsWith("image/") || /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(a.name);
  return (
    <div className="group relative border rounded-md p-2 flex items-center gap-2 bg-white" style={{ borderColor: TK.border }}>
      <div className="w-10 h-10 rounded bg-[#F8FAFC] grid place-items-center overflow-hidden">
        {isImg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={a.url} alt={a.name} className="w-full h-full object-cover" />
        ) : (
          <FileIcon className="w-5 h-5" style={{ color: TK.muted }} />
        )}
      </div>
      <div className="min-w-0">
        <div className="text-sm truncate" title={a.name}>
          {a.name}
        </div>
        <div className="text-xs" style={{ color: TK.muted }}>
          {(a.mime || "file") + (prettySize(a.size) ? ` • ${prettySize(a.size)}` : "")}
        </div>
      </div>
      {onRemove && (
        <button
          onClick={onRemove}
          className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
          aria-label="Remove attachment"
          type="button"
        >
          <X className="w-4 h-4" style={{ color: TK.muted }} />
        </button>
      )}
    </div>
  );
}

/* Reactions (render icons instead of emoji to satisfy “no emoji” guideline) */
const REACTION_ICONS: Record<string, React.ReactNode> = {
  "👍": <ThumbsUp className="w-4 h-4" />,
  "🎉": <Sparkles className="w-4 h-4" />,
  "❤️": <Heart className="w-4 h-4" />,
  "🙏": <Hand className="w-4 h-4" />, // generic hand icon
  "👀": <Eye className="w-4 h-4" />,
};
const DEFAULT_KEYS = ["👍", "🎉", "❤️", "🙏", "👀"];

function Reactions({
  me,
  map,
  onToggle,
}: {
  me: User;
  map: Record<string, string[]> | undefined;
  onToggle: (emojiKey: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {DEFAULT_KEYS.map(key => {
        const count = map?.[key]?.length ?? 0;
        const mine = !!map?.[key]?.includes(me.id);
        return (
          <button
            key={key}
            onClick={() => onToggle(key)}
            className={`h-7 px-2 rounded-full border text-sm leading-none inline-flex items-center gap-1 cursor-pointer transition ${
              mine ? "bg-[#EAF5FD] border-[#D2EFFF]" : "hover:bg-[var(--wr-subtle)]"
            }`}
            style={{ borderColor: TK.border, color: mine ? TK.brand : TK.text }}
            type="button"
            title={mine ? "Remove reaction" : "Add reaction"}
          >
            <span className="inline-flex items-center" style={{ color: TK.brand }}>
              {REACTION_ICONS[key]}
            </span>
            {count > 0 && <span style={{ color: TK.muted }}>{count}</span>}
          </button>
        );
      })}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────────
   Note Card (view / edit)
────────────────────────────────────────────────────────────────────────────── */
function NoteCard({
  note,
  me,
  role,
  searchTerm,
  onUpdate,
  onDelete,
  onTogglePin,
  onToggleReaction,
}: {
  note: Note;
  me: User;
  role: Role;
  searchTerm?: string;
  onUpdate: (patch: Partial<Note>) => void;
  onDelete: () => void;
  onTogglePin: () => void;
  onToggleReaction: (emoji: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note.bodyMd);

  const canEdit = role !== "viewer" && me.id === note.author.id;
  const canPin = role !== "viewer";
  const canDelete = role === "admin";

  const html = useMemo(() => mdToHtml(note.bodyMd, searchTerm), [note.bodyMd, searchTerm]);

  return (
    <article
      className="rounded-xl border w-full"
      style={{ borderColor: TK.border, background: TK.surface, boxShadow: "var(--wr-shadow-sm)" }}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <AvatarImg user={note.author} size={32} />
            <div className="min-w-0">
              <div className="text-sm font-medium truncate" style={{ color: TK.text }}>
                {note.author.name}
              </div>
              <div className="text-xs" style={{ color: TK.muted }}>
                {formatTime(note.updatedAt || note.createdAt)}
              </div>
            </div>
            {note.internal && (
              <Chip tone="brand" icon={<AtSign className="w-3.5 h-3.5" style={{ color: TK.brand }} />}>
                Internal
              </Chip>
            )}
            {note.pinned && (
              <Chip tone="brand" icon={<Pin className="w-3.5 h-3.5" style={{ color: TK.brand }} />}>
                Pinned
              </Chip>
            )}
            {note.tags?.map(t => (
              <Chip key={t} tone="muted">
                {t}
              </Chip>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            {canPin && (
              <IconButton
                title={note.pinned ? "Unpin" : "Pin"}
                onClick={onTogglePin}
                className="hover:shadow-sm"
              >
                {note.pinned ? (
                  <PinOff className="w-4 h-4" style={{ color: TK.brand }} />
                ) : (
                  <Pin className="w-4 h-4" style={{ color: TK.brand }} />
                )}
              </IconButton>
            )}
            {canEdit && !editing && (
              <IconButton title="Edit" onClick={() => setEditing(true)} className="hover:shadow-sm">
                <Edit2 className="w-4 h-4" style={{ color: TK.brand }} />
              </IconButton>
            )}
            {editing && (
              <>
                <IconButton
                  title="Save"
                  onClick={() => {
                    onUpdate({ bodyMd: draft, updatedAt: new Date().toISOString() });
                    setEditing(false);
                  }}
                  className="hover:shadow-sm"
                >
                  <Save className="w-4 h-4" style={{ color: TK.brand }} />
                </IconButton>
                <IconButton
                  title="Cancel"
                  onClick={() => {
                    setDraft(note.bodyMd);
                    setEditing(false);
                  }}
                  className="hover:shadow-sm"
                >
                  <X className="w-4 h-4" style={{ color: TK.muted }} />
                </IconButton>
              </>
            )}
            <IconButton
              title="Copy link"
              onClick={() => {
                const href = `${window.location.pathname}#note-${note.id}`;
                navigator.clipboard.writeText(href).catch(() => {});
              }}
              className="hover:shadow-sm"
            >
              <Copy className="w-4 h-4" style={{ color: TK.brand }} />
            </IconButton>
            {canDelete && (
              <IconButton title="Delete" onClick={onDelete} className="hover:shadow-sm">
                <Trash2 className="w-4 h-4" style={{ color: TK.danger }} />
              </IconButton>
            )}
          </div>
        </div>

        {/* Body */}
        <div id={`note-${note.id}`} className="mt-3 text-[15px] leading-6">
          {editing ? (
            <textarea
              value={draft}
              onChange={e => setDraft(e.target.value)}
              className="w-full min-h-[120px] p-3 rounded-md border focus:outline-none focus:ring-2"
              style={{ borderColor: TK.border }}
              placeholder="Write in markdown…  **bold**, *italic*, `code`, - bullets"
            />
          ) : (
            <div
              className="prose prose-sm max-w-none break-words"
              dangerouslySetInnerHTML={{ __html: html }}
              style={{ color: TK.text }}
            />
          )}
        </div>

        {/* Attachments */}
        {!!note.attachments?.length && (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {note.attachments!.map(a => (
              <AttachmentPreview key={a.id} a={a} />
            ))}
          </div>
        )}

        {/* Reactions */}
        <div className="mt-3">
          <Reactions me={me} map={note.reactions} onToggle={onToggleReaction} />
        </div>
      </div>
    </article>
  );
}

/* ──────────────────────────────────────────────────────────────────────────────
   Composer (sticky inside the section – no viewport-fixed overflow)
────────────────────────────────────────────────────────────────────────────── */
function Composer({
  me,
  users,
  role,
  onCreate,
}: {
  me: User;
  users: User[];
  role: Role;
  onCreate: (note: Omit<Note, "id" | "createdAt">) => void;
}) {
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<Attachment[]>([]);
  const [internal, setInternal] = useState(true);
  const [pinned, setPinned] = useState(false);
  const [mentionQ, setMentionQ] = useState<string>("");
  const [showMentions, setShowMentions] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);

  function onKeyUp() {
    const el = taRef.current!;
    const val = el.value;
    const sel = el.selectionStart || 0;
    const upto = val.slice(0, sel);
    const match = upto.match(/@([\w .-]{0,30})$/);
    if (match) {
      setMentionQ(match[1]);
      setShowMentions(true);
    } else {
      setShowMentions(false);
      setMentionQ("");
    }
  }

  function insertMention(u: User) {
    const el = taRef.current!;
    const sel = el.selectionStart || 0;
    const val = el.value;
    const upto = val.slice(0, sel).replace(/@[\w .-]*$/, "");
    const rest = val.slice(sel);
    const snippet = `@[${u.name}](user:${u.id}) `;
    const next = upto + snippet + rest;
    setBody(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = (upto + snippet).length;
      el.setSelectionRange(pos, pos);
    });
    setShowMentions(false);
  }

  function onAttach(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files;
    if (!f) return;
    const newOnes: Attachment[] = Array.from(f).map(file => ({
      id: uid(),
      name: file.name,
      size: file.size,
      mime: file.type,
      url: URL.createObjectURL(file),
    }));
    setFiles(prev => [...prev, ...newOnes]);
    e.currentTarget.value = "";
  }

  const canPin = role !== "viewer";

  function submit() {
    if (!body.trim() && files.length === 0) return;
    onCreate({
      author: me,
      bodyMd: body.trim(),
      internal,
      pinned: canPin ? pinned : false,
      tags: [],
      attachments: files,
      reactions: {},
      updatedAt: undefined,
    });
    setBody("");
    setFiles([]);
    setPinned(false);
    setInternal(true);
  }

  const mentionCandidates = useMemo(() => {
    const q = mentionQ.trim().toLowerCase();
    if (!showMentions) return [];
    if (!q) return users.slice(0, 6);
    return users.filter(u => u.name.toLowerCase().includes(q)).slice(0, 6);
  }, [mentionQ, showMentions, users]);

  return (
    <div
      className="border rounded-xl sticky bottom-0 bg-white"
      style={{ borderColor: TK.border, boxShadow: "0 -1px 0 rgba(0,0,0,0.04)" }}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <AvatarImg user={me} size={34} />
          <div className="flex-1 min-w-0">
            <div className="relative">
              <textarea
                ref={taRef}
                value={body}
                onChange={e => setBody(e.target.value)}
                onKeyUp={onKeyUp}
                placeholder="Write a note…  Use **bold**, *italic*, `code`, - bullets. Type @ to mention."
                className="w-full min-h-[96px] p-3 rounded-md border focus:outline-none focus:ring-2"
                style={{ borderColor: TK.border }}
              />
              {showMentions && mentionCandidates.length > 0 && (
                <div
                  className="absolute left-2 top-full mt-1 w-64 rounded-md border bg-white shadow"
                  style={{ borderColor: TK.border, boxShadow: "var(--wr-shadow-md)" }}
                >
                  {mentionCandidates.map(u => (
                    <button
                      key={u.id}
                      className="w-full px-2 py-2 flex items-center gap-2 hover:bg-[var(--wr-subtle)] cursor-pointer"
                      onMouseDown={e => {
                        e.preventDefault();
                        insertMention(u);
                      }}
                      type="button"
                    >
                      <AvatarImg user={u} />
                      <div className="text-sm text-left">
                        <div className="font-medium" style={{ color: TK.text }}>
                          {u.name}
                        </div>
                        {u.email && (
                          <div className="text-xs" style={{ color: TK.muted }}>
                            {u.email}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* attachments */}
            {files.length > 0 && (
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {files.map(a => (
                  <AttachmentPreview
                    key={a.id}
                    a={a}
                    onRemove={() => setFiles(prev => prev.filter(x => x.id !== a.id))}
                  />
                ))}
              </div>
            )}

            {/* controls row */}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <label className="inline-flex items-center gap-2 cursor-pointer text-sm">
                  <input type="file" className="hidden" multiple onChange={onAttach} />
                  <span
                    className="inline-flex items-center gap-1 px-2 h-8 rounded-md border hover:bg-[var(--wr-subtle)]"
                    style={{ borderColor: TK.border }}
                  >
                    <Paperclip className="w-4 h-4" style={{ color: TK.brand }} />
                    <span>Attach</span>
                  </span>
                </label>

                {canPin && (
                  <button
                    className="inline-flex items-center gap-1 px-2 h-8 rounded-md border cursor-pointer hover:bg-[var(--wr-subtle)]"
                    style={{ borderColor: TK.border, background: pinned ? "#EAF5FD" : undefined }}
                    onClick={() => setPinned(v => !v)}
                    type="button"
                  >
                    <Pin className="w-4 h-4" style={{ color: TK.brand }} />
                    <span className="text-sm">Pin</span>
                  </button>
                )}

                <button
                  className="inline-flex items-center gap-1 px-2 h-8 rounded-md border cursor-pointer hover:bg-[var(--wr-subtle)]"
                  style={{ borderColor: TK.border, background: internal ? "#EAF5FD" : undefined }}
                  onClick={() => setInternal(v => !v)}
                  type="button"
                >
                  <AtSign className="w-4 h-4" style={{ color: TK.brand }} />
                  <span className="text-sm">Internal</span>
                </button>
              </div>

              <button
                onClick={submit}
                className="inline-flex items-center gap-2 h-9 px-3 rounded-md text-white cursor-pointer"
                style={{ background: TK.brand }}
                type="button"
              >
                <Send className="w-4 h-4" />
                Add note
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────────
   Main Section: NotesTab (with section header + chips + list + composer)
────────────────────────────────────────────────────────────────────────────── */
export function NotesTab({
  me,
  users,
  initialNotes,
  role = "editor",
  searchTerm = "",
  onChange,
}: NotesTabProps) {
  const [notes, setNotes] = useState<Note[]>(
    () =>
      initialNotes ?? [
        {
          id: uid(),
          author: users[0] ?? me,
          createdAt: new Date(Date.now() - 3600_000).toISOString(),
          bodyMd: "Kicked off the crawl for **/blog**. Found ~120 pages.\n- Triage 404s\n- Map redirects\n@[Alex Rivera](user:alex)",
          tags: ["crawl", "blog"],
          attachments: [],
          reactions: { "👍": [me.id] },
          internal: true,
          pinned: true,
        },
        {
          id: uid(),
          author: me,
          createdAt: new Date().toISOString(),
          bodyMd: "Drafted content spec for landing page. See [doc](https://example.com/spec).",
          tags: ["content"],
          attachments: [],
          reactions: {},
          internal: true,
          pinned: false,
        },
      ]
  );

  // Top filters (chips)
  const [fInternal, setFInternal] = useState(false);
  const [fPinned, setFPinned] = useState(false);
  const [fMine, setFMine] = useState(false);

  const filtered = useMemo(() => {
    const q = searchTerm?.trim().toLowerCase();
    return notes.filter(n => {
      if (fInternal && !n.internal) return false;
      if (fPinned && !n.pinned) return false;
      if (fMine && n.author.id !== me.id) return false;
      if (!q) return true;
      const hay = [n.author.name, n.bodyMd, ...(n.tags ?? []), ...(n.attachments?.map(a => a.name) ?? [])]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [notes, searchTerm, fInternal, fPinned, fMine, me.id]);

  const pinned = filtered.filter(n => n.pinned);
  const unpinned = filtered.filter(n => !n.pinned);

  function updateNote(id: string, patch: Partial<Note>) {
    setNotes(prev => {
      const next = prev.map(n => (n.id === id ? { ...n, ...patch } : n));
      onChange?.(next);
      return next;
    });
  }

  function deleteNote(id: string) {
    setNotes(prev => {
      const next = prev.filter(n => n.id !== id);
      onChange?.(next);
      return next;
    });
  }

  function toggleReaction(id: string, emoji: string) {
    setNotes(prev => {
      const next = prev.map(n => {
        if (n.id !== id) return n;
        const cur = n.reactions ?? {};
        const arr = new Set(cur[emoji] ?? []);
        if (arr.has(me.id)) arr.delete(me.id);
        else arr.add(me.id);
        return { ...n, reactions: { ...cur, [emoji]: Array.from(arr) } };
      });
      onChange?.(next);
      return next;
    });
  }

  function create(note: Omit<Note, "id" | "createdAt">) {
    const newNote: Note = { id: uid(), createdAt: new Date().toISOString(), ...note };
    setNotes(prev => {
      const next = [newNote, ...prev];
      onChange?.(next);
      return next;
    });
  }

  return (
    <>
      <GlobalTokens />
      <section className="wr-font">
        {/* Section container */}
        <div
          className="mx-auto w-full rounded-xl border"
          style={{ borderColor: TK.border, background: TK.surface, boxShadow: "var(--wr-shadow-sm)" }}
        >
          {/* Header */}
          <div
            className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between px-4 py-3 border-b"
            style={{ borderColor: TK.borderLight }}
          >
            <div className="flex items-center gap-2">
              <NotebookPen className="h-5 w-5" style={{ color: TK.brand }} />
              <h3 className="text-lg font-semibold" style={{ color: TK.text }}>
                Notes
              </h3>
              <Info className="h-4 w-4" style={{ color: TK.brand }} aria-label="Page‑scoped notes with mentions and attachments" />
            </div>

            {/* Filters row (modern chips) */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-2 h-8 px-3 rounded-full border bg-white text-[12px] hover:bg-[var(--wr-subtle)] cursor-pointer"
                style={{ borderColor: TK.border }}
                onClick={() => window.dispatchEvent(new CustomEvent("wr:notes:openFilters"))}
                title="Filters"
              >
                <FilterIcon size={14} style={{ color: TK.brand }} />
                <span>Filters</span>
              </button>

              <FilterChip active={fInternal} onClick={() => setFInternal(v => !v)} leading={<AtSign className="w-4 h-4" style={{ color: TK.brand }} />}>
                Internal
              </FilterChip>
              <FilterChip active={fPinned} onClick={() => setFPinned(v => !v)} leading={<Pin className="w-4 h-4" style={{ color: TK.brand }} />}>
                Pinned
              </FilterChip>
              <FilterChip
                active={fMine}
                onClick={() => setFMine(v => !v)}
                leading={<NotebookPen className="w-4 h-4" style={{ color: TK.brand }} />}
              >
                My notes
              </FilterChip>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            {/* Pinned first (if any) */}
            {pinned.length > 0 && (
              <div
                className="rounded-xl p-3.5 border"
                style={{ borderColor: TK.borderLight, background: TK.subtle }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium" style={{ color: TK.text }}>
                    Pinned
                  </div>
                  <Chip tone="muted">{pinned.length} item{pinned.length === 1 ? "" : "s"}</Chip>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {pinned.map(n => (
                    <NoteCard
                      key={n.id}
                      note={n}
                      me={me}
                      role={role}
                      searchTerm={searchTerm}
                      onUpdate={patch => updateNote(n.id, patch)}
                      onDelete={() => deleteNote(n.id)}
                      onTogglePin={() => updateNote(n.id, { pinned: !n.pinned })}
                      onToggleReaction={e => toggleReaction(n.id, e)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Unpinned list */}
            <div className="space-y-3">
              {unpinned.map(n => (
                <NoteCard
                  key={n.id}
                  note={n}
                  me={me}
                  role={role}
                  searchTerm={searchTerm}
                  onUpdate={patch => updateNote(n.id, patch)}
                  onDelete={() => deleteNote(n.id)}
                  onTogglePin={() => updateNote(n.id, { pinned: !n.pinned })}
                  onToggleReaction={e => toggleReaction(n.id, e)}
                />
              ))}

              {filtered.length === 0 && (
                <div
                  className="border rounded-xl p-8 grid place-items-center text-center"
                  style={{ borderColor: TK.border }}
                >
                  <div className="text-sm" style={{ color: TK.muted }}>
                    No notes match current filters. Try adjusting filters or add a new note below.
                  </div>
                </div>
              )}
            </div>

            {/* Composer (inside section; sticky at bottom of the card) */}
            {role === "viewer" ? (
              <div className="text-sm" style={{ color: TK.muted }}>
                You don’t have permission to add notes.
              </div>
            ) : (
              <Composer me={me} users={users} role={role} onCreate={create} />
            )}
          </div>
        </div>

        {/* Mentions style */}
        <style jsx global>{`
          .mention {
            background: #eaf5fd;
            border-radius: 4px;
            padding: 0 4px;
          }
        `}</style>
      </section>
    </>
  );
}

/* ──────────────────────────────────────────────────────────────────────────────
   Demo wrapper (remove in production)
────────────────────────────────────────────────────────────────────────────── */
const DEMO_USERS: User[] = [
  { id: "alex", name: "Alex Rivera", email: "alex@acme.co" },
  { id: "sam", name: "Sam Carter", email: "sam@acme.co" },
  { id: "lee", name: "Lee Wong", email: "lee@acme.co" },
];

const DEMO_ME: User = { id: "me", name: "You (Demo)", email: "you@example.com" };

export default function NotesTabDemo() {
  return (
    <div className="mt-4 bg-[var(--wr-subtle)] w-full">
      <NotesTab me={DEMO_ME} users={DEMO_USERS} />
    </div>
  );
}
