"use client";

import React, { useEffect, useMemo, useState } from "react";
import { X, Upload, Download, ChevronDown, AlertCircle, CheckCircle2, Info, Loader2 } from "lucide-react";
import { BASE_URL_WR } from "@/src/util/api";
import Cookies from "js-cookie";


const TK = {
  brand: "#1090D0",
  text: "#111827",
  muted: "#6B7280",
  surface: "#FFFFFF",
  subtle: "#F5F7FA",
  border: "#EFF0F6",
  borderStrong: "#E5E7EB",
  focus: "#D2EFFF",
  radius: 12,
  z: 1200,
};

type PreviewRow = {
  row: number;
  title: string;
  description: string;
  status: "valid" | "warning" | "error";
  issues: string[];
};

const fmtBytes = (b: number) => {
  if (b < 1024) return `${b} B`;
  const kb = b / 1024; if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024; return `${mb.toFixed(2)} MB`;
};
const cx = (...cls: (string | false | null | undefined)[]) => cls.filter(Boolean).join(" ");
const by = <T,>(arr: T[], start: number, size: number) => arr.slice(start, start + size);

// ───────────────── CSV parser (RFC-ish) ─────────────────
function parseCSV(text: string) {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const delimiter = (text.split(";").length > text.split(",").length) ? ";" : ",";
  const rows: string[][] = [];
  let i = 0, field = "", row: string[] = [], inQuotes = false;
  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i += 2; continue; } inQuotes = false; i++; continue; }
      field += c; i++; continue;
    }
    if (c === '"') { inQuotes = true; i++; continue; }
    if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; rows.push([...row, field]); row = []; field = ""; i++; continue; }
    if (c === delimiter) { row.push(field); field = ""; i++; continue; }
    field += c; i++;
  }
  rows.push([...row, field]);
  if (rows.length && rows[rows.length - 1].every((c) => c === "")) rows.pop();
  return rows;
}

const stripHtml = (s: string) => s.replace(/<[^>]+>/g, "");
const normalize = (s: string) =>
  stripHtml(s).replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"').trim().replace(/\s+/g, " ");
const accessToken = Cookies.get("login_access_token_wrank");

// ───────────────── API helper ─────────────────
async function apiFetch(path: string, init?: RequestInit) {
  const url = path.startsWith("http") ? path : BASE_URL_WR + path.replace(/^\/+/, "");
  const res = await fetch(url, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    }, ...init
  });
  if (!res.ok) {
    let t = "";
    try { t = await res.text(); } catch { }
    throw new Error(t || res.statusText || "Request failed");
  }
  return res.status === 204 ? null : res.json();
}

// ───────────────── Small UI bits ─────────────────
const StatusPill: React.FC<{ s: PreviewRow["status"] }> = ({ s }) => {
  const map = { valid: { c: "#10B981", t: "Valid", Icon: CheckCircle2 }, warning: { c: "#F59E0B", t: "Warning", Icon: AlertCircle }, error: { c: "#EF4444", t: "Error", Icon: AlertCircle } } as const;
  const { c, t, Icon } = map[s];
  return <span className="inline-flex items-center gap-1 text-xs" style={{ color: c }}><Icon size={14} />{t}</span>;
};

const IssueTooltip: React.FC<{ issues: string[] }> = ({ issues }) => {
  if (!issues?.length) return null;
  return (
    <span className="group relative inline-flex items-center text-[#9CA3AF]" aria-label="Why?">
      <Info size={14} />
      <span className="invisible group-hover:visible absolute left-1/2 -translate-x-1/2 top-5 z-[2000] whitespace-pre rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] text-[#111827] shadow">
        {issues.join(", ")}
      </span>
    </span>
  );
};

const Toast: React.FC<{ msg: string; onDone: () => void }> = ({ msg, onDone }) => {
  useEffect(() => { const t = setTimeout(onDone, 2200); return () => clearTimeout(t); }, [onDone]);
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 rounded-md border bg-white px-4 py-2 shadow"
      style={{ borderColor: TK.borderStrong, zIndex: TK.z + 10 }}>{msg}</div>
  );
};

const PAGE_SIZE_DEFAULT = 20;

const PreviewGrid: React.FC<{
  rows: PreviewRow[];
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  showOnlyErrors: boolean;
  totalCount: number;
}> = ({ rows, page, pageSize, onPageChange, showOnlyErrors, totalCount }) => {
  const filtered = useMemo(() => showOnlyErrors ? rows.filter((r) => r.status === "error") : rows, [rows, showOnlyErrors]);
  const start = (page - 1) * pageSize;
  const slice = by(filtered, start, pageSize);
  const end = Math.min(start + pageSize, filtered.length);

  return (
    <div className="w-full">
      <div className="mb-2 text-sm text-[#6B7280]">Showing {filtered.length ? `${start + 1}–${end}` : 0} of {totalCount}</div>
      <div className="overflow-auto rounded-md border" style={{ borderColor: TK.borderStrong }}>
        <table className="min-w-[720px] w-full text-sm">
          <thead className="sticky top-0 z-[1] bg-white" style={{ borderBottom: `1px solid ${TK.borderStrong}` }}>
            <tr className="text-left text-[#6B7280]">
              {['#', 'Task Title', 'Description', 'Row Status', 'Why?'].map((h) => (
                <th key={h} className="px-3 py-2 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slice.map((r) => (
              <tr key={r.row} className="border-t" style={{ borderColor: TK.border }}>
                <td className="px-3 py-2 w-14">{r.row}</td>
                <td className="px-3 py-2">{r.title || <span className="text-[#EF4444]">(missing)</span>}</td>
                <td className="px-3 py-2">{r.description || <span className="text-[#9CA3AF]">—</span>}</td>
                <td className="px-3 py-2"><StatusPill s={r.status} /></td>
                <td className="px-3 py-2"><IssueTooltip issues={r.issues} /></td>
              </tr>
            ))}
            {!slice.length && (
              <tr>
                <td className="px-3 py-10 text-center text-[#6B7280]" colSpan={5}>No rows to display.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-3 flex items-center justify-between text-sm">
        <div className="text-[#6B7280]">Page {page} of {Math.max(1, Math.ceil(filtered.length / pageSize))}</div>
        <div className="flex items-center gap-2">
          <button className="rounded border px-2 py-1" style={{ borderColor: TK.borderStrong }} onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page === 1}>Prev</button>
          <button className="rounded border px-2 py-1" style={{ borderColor: TK.borderStrong }} onClick={() => onPageChange(Math.min(Math.ceil(filtered.length / pageSize) || 1, page + 1))} disabled={page >= Math.ceil(filtered.length / pageSize)}>Next</button>
        </div>
      </div>
    </div>
  );
};

// ───────────────── Drawer Component ─────────────────
function useDirtyConfirm(dirty: boolean) {
  return () => !dirty || window.confirm("Discard changes?");
}

export default function TemplateUploadDrawer({
  open,
  setOpen,
  onSaved,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  onSaved?: (templateId?: string) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [filename, setFilename] = useState("");
  const [filesize, setFilesize] = useState<number>(0);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "ready" | "error">("idle");
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [categories, setCategories] = useState<any[]>([]);
  const [campaignId, setCampaignId] = useState<number | null>(null);
  const [isCustomCampaign, setIsCustomCampaign] = useState(false);
  const [customCampaignName, setCustomCampaignName] = useState("");

  // template payload fields
  const [templateName, setTemplateName] = useState<string>("");
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [rowCount, setRowCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [warningCount, setWarningCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(PAGE_SIZE_DEFAULT);
  const [showOnlyErrors, setShowOnlyErrors] = useState(false);

  const dirty = useMemo(() => !!file || templateName.length > 0, [file, templateName]);
  const confirmClose = useDirtyConfirm(dirty);

  // Fetch categories → dedupe to campaign options
  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const list = await apiFetch("categories/");
        setCategories(Array.isArray(list) ? list : []);
        const first = Array.isArray(list) && list.length ? list[0] : null;
        if (first) {
          setCampaignId(first.CampaignName);
          setIsCustomCampaign(false);
          setCustomCampaignName("");
        }
      } catch {
        setErrMsg("Could not load campaigns.");
      }
    })();
  }, [open]);

  const campaigns = useMemo(() => {
    const m = new Map<number, string>();
    categories.forEach((c) => { if (!m.has(c.CampaignName)) m.set(c.CampaignName, c.campaign_name); });
    return Array.from(m.entries()).map(([id, name]) => ({ id, name }));
  }, [categories]);

  // reset on close
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setFile(null); setFilename(""); setFilesize(0); setUploadStatus("idle"); setErrMsg(null);
        setTemplateName(""); setPreviewRows([]); setRowCount(0); setErrorCount(0); setWarningCount(0);
        setPage(1); setShowOnlyErrors(false);
        // reset campaign to first when reopened
        setIsCustomCampaign(false); setCustomCampaignName("");
      }, 200);
    }
  }, [open]);

  const canSave = uploadStatus === "ready" && templateName.trim().length > 0 && errorCount === 0 &&
    (isCustomCampaign ? customCampaignName.trim().length > 0 : !!campaignId);

  // CSV only
  const onFileSelect = async (f: File) => {
    setErrMsg(null);
    const isCSV = /\.csv$/i.test(f.name) || f.type.includes("csv");
    if (!isCSV) { setUploadStatus("error"); setErrMsg("Only .csv is accepted."); return; }
    if (f.size > 10 * 1024 * 1024) { setUploadStatus("error"); setErrMsg("File exceeds 10MB limit."); return; }

    setFile(f); setFilename(f.name); setFilesize(f.size);
    setTemplateName(f.name.replace(/\.csv$/i, ""));
    setUploadStatus("uploading");

    try {
      const text = await f.text();
      const rows = parseCSV(text);
      if (!rows.length) throw new Error("Empty file.");

      // headers: Task Title (required), Description (optional)
      const header = rows[0].map((h) => h?.toString().trim().toLowerCase());
      const idx = {
        title: header.findIndex((h) => h && /^(task\s*)?title$|^task$/.test(h)),
        desc: header.findIndex((h) => h && /^description$|^desc$/.test(h)),
      };
      if (idx.title === -1) throw new Error("Missing 'Task Title' column.");

      const preview: PreviewRow[] = [];
      let eCount = 0; let wCount = 0;
      for (let r = 1; r < rows.length; r++) {
        const raw = rows[r] || [];
        if (!raw || raw.every((c) => !c || String(c).trim() === "")) continue;

        const title = normalize(String(raw[idx.title] ?? ""));
        const description = normalize(String(idx.desc >= 0 ? raw[idx.desc] : ""));

        const issues: string[] = [];
        if (!title) issues.push("missing_title");

        let status: PreviewRow["status"] = "valid";
        if (issues.includes("missing_title")) { status = "error"; eCount++; }
        else if (issues.length) { status = "warning"; wCount++; }

        preview.push({ row: r, title, description, status, issues });
      }

      setPreviewRows(preview);
      setRowCount(preview.length);
      setErrorCount(eCount);
      setWarningCount(wCount);
      setPage(1);
      setUploadStatus("ready");
    } catch (e: any) {
      setUploadStatus("error");
      setErrMsg(e?.message || "Upload failed. Please try again.");
    }
  };

  const resetAndClose = () => {
    setFile(null); setFilename(""); setFilesize(0); setUploadStatus("idle"); setErrMsg(null);
    setTemplateName(""); setPreviewRows([]); setRowCount(0); setErrorCount(0); setWarningCount(0);
    setPage(1); setShowOnlyErrors(false);
    setIsCustomCampaign(false); setCustomCampaignName("");
    setOpen(false);
  };

  const handleSaveTemplate = async () => {
    if (!canSave) return;
    try {
      const customName = (customCampaignName || "").trim();
      const campaign =
        (isCustomCampaign && customName) ? { name: customName } :
          (campaignId ? { id: campaignId } : null);

      if (!campaign) { setErrMsg("Select a Campaign Type or enter a custom name."); return; }

      const activities = previewRows
        .filter((r) => r.status !== "error" && r.title.trim())
        .map((r) => ({ title: r.title.trim(), description: r.description?.trim() || "" }));

      if (!activities.length) { setErrMsg("No valid rows to import."); return; }

      await apiFetch("create-templates/", {
        method: "POST",
        body: JSON.stringify({
          campaign,
          category: { name: templateName.trim() },   // use Template Name as category
          activities,
        }),
      });

      setToast("Template created.");
      onSaved?.();            // triggers fetchMyTemplates() upstream
      resetAndClose();        // clear state and close
    } catch (e: any) {
      setErrMsg("Could not save template.");
    }
  };

  const onDownloadSample = () => {
    const sample = [
      ["Task Title", "Description"],
      ["Fix Broken Links", "Find 404/410 and replace or redirect."],
      ["Add Meta Descriptions", "Write compelling descriptions ~150 chars."],
      ["Improve LCP", "Optimise hero image + critical CSS."],
    ].map((r) => r.join(",")).join("\n");
    const blob = new Blob([sample], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "wranker_template_sample.csv"; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  };

  if (!open) return null;

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="tpl-upload-title" className="fixed inset-0" style={{ zIndex: TK.z }}>
      <div className="absolute inset-0 bg-black/30" onClick={() => { if (confirmClose()) resetAndClose(); }} />
      <div className="absolute right-0 top-0 h-full w-[640px] max-w-[90vw] bg-white shadow-xl" style={{ borderLeft: `1px solid ${TK.border}` }}>
        {/* Header */}
        <div className="sticky top-0 z-[2] flex items-start justify-between border-b bg-white p-4" style={{ borderColor: TK.border }}>
          <div>
            <h2 id="tpl-upload-title" className="text-lg font-semibold" style={{ color: TK.text }}>Upload Template from File</h2>
            <p className="mt-1 text-sm" style={{ color: TK.muted }}>Accepted: .csv only • Max 10MB • Up to 1,000 tasks</p>
          </div>
          <button onClick={() => { if (confirmClose()) resetAndClose(); }} className="rounded p-2 hover:bg-[#F5F7FA]" aria-label="Close"><X size={18} /></button>
        </div>

        {/* Body */}
        <div className="h-[calc(100%-160px)] overflow-y-auto p-4">
          {/* File picker row */}
          <div className="mb-4 rounded-lg border p-4" style={{ borderColor: TK.borderStrong, background: TK.subtle }}>
            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-2">
                <input
                  type="file"
                  className="hidden"
                  accept=".csv"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) onFileSelect(f); }}
                />
                <span className="inline-flex items-center gap-2 rounded-md bg-[#1090D0] px-3 py-2 text-white cursor-pointer"><Upload size={16} /> Choose file</span>
              </label>
              <button onClick={onDownloadSample} className="inline-flex items-center gap-2 rounded-md border px-3 py-2" style={{ borderColor: TK.borderStrong }}>
                <Download size={16} /> Download sample
              </button>
              {/* {filename && <div className="ml-auto text-sm text-[#6B7280]">{filename} • {fmtBytes(filesize)}</div>} */}
            </div>
            {uploadStatus !== "idle" && (
              <div className="mt-3 text-sm">
                {uploadStatus === "uploading" && <div className="inline-flex items-center gap-2 text-[#6B7280]"><Loader2 className="animate-spin" size={16} /> Parsing…</div>}
                {uploadStatus === "ready" && (
                  <div className="flex flex-wrap items-center gap-3 text-[#6B7280]">
                    <span>{rowCount} rows parsed</span>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#EF4444]" /> {errorCount} errors</span>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#F59E0B]" /> {warningCount} warnings</span>
                  </div>
                )}
                {uploadStatus === "error" && <div className="text-[#EF4444]">{errMsg}</div>}
              </div>
            )}
          </div>

          {/* Template details */}
          <div className="mb-6 grid grid-cols-1 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium" style={{ color: TK.text }}>
                Template Name <span className="text-[#EF4444]">*</span>
              </label>
              <input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Used as Category name"
                className="w-full rounded-md border px-3 py-2 outline-none focus:ring"
                style={{ borderColor: TK.borderStrong, boxShadow: `0 0 0 3px transparent` }}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium" style={{ color: TK.text }}>
                Campaign Type <span className="text-[#EF4444]">*</span>
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={isCustomCampaign ? "__custom__" : (campaignId ?? "")}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "__custom__") {
                      setIsCustomCampaign(true);
                      setCustomCampaignName("");
                      setCampaignId(null); // clear any previous id to avoid leaking {id}
                    } else {
                      setIsCustomCampaign(false);
                      setCustomCampaignName("");
                      setCampaignId(Number(v));
                    }
                  }}
                  className="w-full rounded-md border px-3 py-2"
                  style={{ borderColor: TK.borderStrong }}
                >
                  {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  <option value="__custom__">➕ Add custom…</option>
                </select>

                {isCustomCampaign && (
                  <input
                    value={customCampaignName}
                    onChange={(e) => setCustomCampaignName(e.target.value)}
                    placeholder="Enter custom campaign name"
                    className="flex-1 rounded-md border px-3 py-2 outline-none"
                    style={{ borderColor: customCampaignName.trim() ? TK.borderStrong : "#EF4444" }}
                  />
                )}
              </div>
              {isCustomCampaign && !customCampaignName.trim() && (
                <div className="mt-1 text-xs text-[#EF4444]">Custom name is required.</div>
              )}
            </div>
          </div>

          {/* Summary banner + filter toggle */}
          {uploadStatus === "ready" && (
            <div className="mb-3 flex items-center justify-between rounded-md border bg-white p-3" style={{ borderColor: TK.borderStrong }}>
              <div className="flex items-center gap-3 text-sm" style={{ color: TK.muted }}>
                <span>{rowCount} rows parsed</span>
                <span>•</span>
                <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#EF4444]" /> {errorCount} errors</span>
                <span>•</span>
                <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#F59E0B]" /> {warningCount} warnings</span>
              </div>
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" checked={showOnlyErrors} onChange={(e) => setShowOnlyErrors(e.target.checked)} />
                <span>View errors only</span>
              </label>
            </div>
          )}

          {/* Preview grid */}
          {uploadStatus === "ready" && (
            <PreviewGrid
              rows={previewRows}
              page={page}
              pageSize={pageSize}
              onPageChange={setPage}
              showOnlyErrors={showOnlyErrors}
              totalCount={rowCount}
            />
          )}

          {uploadStatus === "idle" && (
            <div className="rounded-md border p-6 text-center text-[#6B7280]" style={{ borderColor: TK.borderStrong }}>
              Choose a .csv file to begin. Max 10MB / 1,000 rows.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 z-[2] flex items-center justify-between border-t bg-white p-4" style={{ borderColor: TK.border }}>
          <button
            className="rounded-md px-3 py-2"
            onClick={() => { if (confirmClose()) resetAndClose(); }}
            style={{ border: `1px solid ${TK.borderStrong}`, background: TK.subtle }}
          >
            Cancel
          </button>
          <div className="flex items-center gap-2">
            <button
              disabled={!canSave}
              onClick={handleSaveTemplate}
              className={cx("rounded-md px-3 py-2 text-white", canSave ? "bg-[#1090D0] hover:brightness-95" : "bg-[#93C5FD] cursor-not-allowed")}
            >
              Save Template
            </button>
            {/* Keeping Apply dropdown UI out; upload flow creates the template directly */}
            <div className="relative">
              <button disabled className="inline-flex items-center gap-1 rounded-md px-3 py-2 text-white bg-[#93C5FD] cursor-not-allowed">
                Apply Now <ChevronDown size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {toast && <Toast msg={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
