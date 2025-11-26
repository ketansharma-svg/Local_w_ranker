"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Drawer, message, Modal } from "antd";
import { FileText, Loader2 } from "lucide-react";
import Cookies from "js-cookie";
import { motion, AnimatePresence } from "framer-motion";
import { ApplyTemplateModal } from "./ApplyTemplate";

import {
  fetchGlobalTemplates,
  fetchMyTemplates,
  selectTemplates,
  selectTemplatesLoading,
} from "@/src/redux/reducer/campaignReducer";
import { BASE_URL_WR } from "@/src/util/api";

/* ───────────────────────── Design Tokens (Wranker) ───────────────────────── */
const TK = {
  brand: "#008CCD",
  brandHover: "#007DB3",
  valueBlue: "#0077FF",
  text: "#111827",
  title: "#000000",
  muted: "#6B7280",
  border: "#EFF0F6",
  borderStrong: "#E5E7EB",
  subtle: "#F5F7FA",
  focus: "#D2EFFF",
  z: 1100,
};

/* ───────────────────────── Utilities ───────────────────────── */
const pad2 = (n: number) => String(n).padStart(2, "0");
const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};
const addDaysISO = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};
const isWeekendISO = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`);
  const wd = d.getDay(); // 0=Sun 6=Sat
  return wd === 0 || wd === 6;
};
const fmtDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

/* ───────────────────────── Types ───────────────────────── */
type Row = {
  id: string;
  title: string;
  campaignType: string;
  taskCount: number;
  updatedAt: string;
  projectCount: number;
  activities?: Array<{
    id: string | number;
    title: string;
    description?: string;
    created_at?: string;
    updated_at?: string;
    is_published?: boolean;
  }>;
};

type Priority = "High" | "Medium" | "Low";
type TaskForPreview = { title: string; description: any; durationDays: number; priority: Priority };
type PreviewRow = {
  idx: number;
  title: string;
  description: string;
  durationDays: number;
  estDue: string;
  priority: Priority;
  weekend: boolean;
};

/* Activities → Tasks mapping (same defaults as table: 1 day, first two High).  */
function tasksFromActivities(acts: Row["activities"]): TaskForPreview[] {
  return (acts || []).map((a, i) => ({
    title: a.title,
    description: a.description || "",
    durationDays: 1,
    priority: i < 2 ? "High" : "Medium",
  }));
}

/* Build preview schedule (sequential vs non-sequential) */
function computePreview(
  tasks: TaskForPreview[],
  startISO: string,
  sequential: boolean
): { rows: PreviewRow[]; lastDue: string; weekendCount: number } {
  const rows: PreviewRow[] = [];
  let cursor = startISO;
  let last = startISO;

  tasks.forEach((t, i) => {
    const start = sequential ? cursor : startISO;
    const due = addDaysISO(start, Math.max(1, t.durationDays) - 1);
    if (sequential) cursor = addDaysISO(due, 1);
    last = due;
    rows.push({
      idx: i + 1,
      title: t.title,
      description: t.description,
      durationDays: t.durationDays,
      estDue: due,
      priority: t.priority,
      weekend: isWeekendISO(due),
    });
  });

  return { rows, lastDue: last, weekendCount: rows.filter((r) => r.weekend).length };
}

/* ───────────────────────── Animations ───────────────────────── */
const fadeListItem:any = (i = 0) => ({
  initial: { opacity: 0, y: 6, filter: "blur(3px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.22, ease: "easeOut", delay: i * 0.012 } },
  exit: { opacity: 0, y: -6, filter: "blur(3px)", transition: { duration: 0.16, ease: "easeIn" } },
});

const fadeInBlock:any = {
  initial: { opacity: 0, y: 8, filter: "blur(5px)" },
  whileInView: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.25, ease: "easeOut" } },
  exit: { opacity: 0, y: -8, filter: "blur(5px)", transition: { duration: 0.18 } },
  viewport: { once: true, amount: 0.15 },
};


/* ───────────────────────── Component ───────────────────────── */
export const GlobalTemplateGalleryDrawer: React.FC<{
  open: boolean;
  onClose: () => void;
  initialDestinations?: number[];
  onApplied?: (payload: { createdTasks?: number; projects: number[] }) => void;
}> = ({ open, onClose, initialDestinations = [], onApplied }) => {
  const dispatch = useDispatch();
  const templateData = useSelector(selectTemplates) as any[] | undefined;
  const loading = useSelector(selectTemplatesLoading) as boolean;

  const [applyOpen, setApplyOpen] = React.useState(false);
  const [applyTpl, setApplyTpl] = React.useState<{ id?: string; name?: string; tasks?: any[] } | null>(null);

  /* Load catalogue when opened (idempotent) */
  useEffect(() => {
    if (!open) return;
    if (!templateData || templateData.length === 0) {
      dispatch(fetchGlobalTemplates() as any);
    }
  }, [open, templateData, dispatch]);

  /* Flatten campaigns → categories → rows */
  const rows: Row[] = useMemo(() => {
    const flat: Row[] = [];
    (templateData || []).forEach((camp: any) => {
      (camp?.categories || []).forEach((cat: any) => {
        const latest = (cat.activities || []).reduce((acc: string, a: any) => {
          const t = a?.updated_at || a?.created_at || "";
          return t && (!acc || new Date(t) > new Date(acc)) ? t : acc;
        }, "");
        flat.push({
          id: `cat-${cat.id}`,
          title: cat.template_name,
          campaignType: camp.campaign_name,
          activities: cat.activities,
          taskCount: (cat.activities || []).length,
          updatedAt: latest || new Date().toISOString(),
          projectCount: cat?.project_count || 0,
        });
      });
    });
    return flat;
  }, [templateData]);

  /* Search + filter (campaign) */
  const [q, setQ] = useState("");
  const [campaignFilter, setCampaignFilter] = useState<string>("All");

  const campaigns = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) => s.add(String(r.campaignType)));
    return ["All", ...Array.from(s)];
  }, [rows]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return rows.filter((r) => {
      const matchesQ = !qq || r.title.toLowerCase().includes(qq);
      const matchesC = campaignFilter === "All" || String(r.campaignType) === campaignFilter;
      return matchesQ && matchesC;
    });
  }, [rows, q, campaignFilter]);

  

  /* Selection + scheduling */
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = useMemo(() => filtered.find((r) => r.id === selectedId) || null, [filtered, selectedId]);

  const [startDate, setStartDate] = useState<string>(todayISO());
  const [sequential, setSequential] = useState<boolean>(true);

  useEffect(() => {
  if (open && rows.length > 0 && !selectedId) {
    setSelectedId(rows[0].id); // preselect first item
  }
}, [open, rows, selectedId]);


  useEffect(() => {
    if (!open) return;
    // reset selection when it opens
    setSelectedId(null);
    setQ("");
    setCampaignFilter("All");
    setStartDate(todayISO());
    setSequential(true);
    setDestInput(initialDestinations.join(","));
  }, [open]); // eslint-disable-line

  const preview = useMemo(() => {
    const tasks = tasksFromActivities(selected?.activities);
    return computePreview(tasks, startDate, sequential);
  }, [selected, startDate, sequential]);

  /* Apply/Import state */
  const [busy, setBusy] = useState<false | "import" | "apply">(false);
  const [destInput, setDestInput] = useState<string>(initialDestinations.join(","));
  const destinations = useMemo(
    () =>
      destInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => Number(s))
        .filter((n) => Number.isFinite(n) && n > 0),
    [destInput]
  );

  const numericCategoryId = useMemo(() => {
    if (!selected?.id) return undefined;
    const n = Number(String(selected.id).replace("cat-", ""));
    return Number.isFinite(n) ? n : undefined;
  }, [selected?.id]);

  const templateName = selected?.title || "";
  const accessToken = Cookies.get("login_access_token_wrank");

  async function handleImportTemplate() {
    if (!numericCategoryId) return message.error("No template selected.");
    try {
      setBusy("import");
      const res = await fetch(`${BASE_URL_WR}import-templates/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ category_id: numericCategoryId }),
      });
      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || `HTTP ${res.status}`);
      }
      message.success(`Imported template: ${templateName}`);
      dispatch(fetchMyTemplates() as any);
    } catch (e: any) {
      message.error(e?.message || "Import failed.");
    } finally {
      setBusy(false);
    }
  }

  function onOpenApply(category: any) {
    setApplyTpl({
      id: category?.id,
      name: category?.template_name ?? category?.name ?? "Template",
      tasks: category?.activities ?? [],
    });
    setApplyOpen(true);
  }

  function linkifyDesc(input: string | undefined | null): string {
  const text = (input ?? "").trim();
  if (!text) return "";

  // If HTML already contains links, don’t double-wrap
  if (/<a\s/i.test(text)) return text;

  // Simple URL matcher (http/https)
  const urlRE =
    /\bhttps?:\/\/[^\s<>"')\]]+/gi;

  // Replace plain URLs with anchors
  return text.replace(urlRE, (url) => {
    // Escape basic HTML in the visible label to avoid injecting markup from URL
    const label = url
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-[#0077FF] underline">${label}</a>`;
  });
}


  if (!open) return null;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={1200}
      maskStyle={{ background: "rgba(17,24,39,0.45)" }}
      zIndex={TK.z}
      footer={null}
      bodyStyle={{ padding: 0, overflow: "hidden" }}
      destroyOnClose
      keyboard
      closable={false}
      className="wr-global-template-drawer"
    >
      <section className="max-h-screen bg-white text-[#111827] flex flex-col relative">
        {/* Header */}
        <motion.div
          {...fadeInBlock}
          className="px-3.5 py-3 border-b border-[#E5E7EB] grid grid-cols-[1fr_auto_auto] gap-2 items-center"
        >
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-gray-700" aria-hidden="true" />
            <h2 className="m-0 text-lg font-bold text-gray-900">Global Template Gallery</h2>
          </div>

          <div className="flex gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search templates…"
              aria-label="Search templates"
              className="w-[220px] px-2.5 py-2 border border-[#E5E7EB] rounded-lg outline-none focus:ring-2 focus:ring-[#D2EFFF]"
            />
            <select
              value={campaignFilter}
              onChange={(e) => setCampaignFilter(e.target.value)}
              aria-label="Campaign type"
              className="px-2.5 py-2 border border-[#E5E7EB] rounded-lg"
            >
              {campaigns.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

          </div>

          <div className="flex gap-2 items-center">
            <button
              onClick={onClose}
              aria-label="Close"
              className="border border-[#E5E7EB] rounded-lg w-8 h-8 bg-white hover:bg-gray-50 transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>
        </motion.div>

        {/* Body */}
        <div className="grid grid-cols-[360px_1fr] min-h-[420px] flex-1 overflow-hidden">
          {/* Left: Template list */}
          <div className="border-r border-[#E5E7EB] overflow-y-auto">
            {loading && (
              <div className="p-3 text-sm text-[#6B7280] min-h-screen">Loading templates…</div>
            )}

            {!loading && filtered.length === 0 && (
              <motion.div
                {...fadeInBlock}
                className="p-4 text-sm text-[#6B7280]"
              >
                No templates match your filters.
              </motion.div>
            )}

            <AnimatePresence initial={false} >
              {!loading &&
                filtered.map((r, idx) => {
                  const active = selectedId === r.id;
                  return (
                    <motion.button
                      key={r.id}
                      onClick={() => setSelectedId(r.id)}
                      className={`w-full text-left p-3 border-b border-[${TK.border}] hover:bg-[#f8fbff] transition-colors cursor-pointer ${
                        active ? "bg-[#008ccd33]" : "bg-white"
                      }`}
                      aria-pressed={active}
                      {...fadeListItem(idx)}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`text-[11px] border border-[#E5E7EB] px-1.5 py-0.5 rounded-md ${active ?"bg-white" :""}`}>
                          {r.campaignType}
                        </span>
                        <div className="font-semibold text-sm text-black truncate">{r.title}</div>
                      </div>
                      <div className="flex gap-2 mt-1.5 text-xs text-[#6B7280]">
                        <span>{r.taskCount} task(s)</span>
                        <span>•</span>
                        <span>Updated {fmtDate(r.updatedAt)}</span>
                        {r.projectCount > 0 && (
                          <>
                            <span>•</span>
                            <span>{r.projectCount} project(s)</span>
                          </>
                        )}
                      </div>
                    </motion.button>
                  );
                })}
            </AnimatePresence>
          </div>

          {/* Right: Preview panel */}
          <div className="relative overflow-y-auto">
            {!selected ? (
              <motion.div
                {...fadeInBlock}
                className="w-full h-full flex items-center justify-center text-sm text-[#6B7280]"
              >
                Select a template on the left to preview tasks.
              </motion.div>
            ) : (
              <motion.div
                {...fadeInBlock}
                className="p-4 grid gap-3 relative"
              >
                {/* Selection summary */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0, transition: { duration: 0.35 } }}
                  exit={{ opacity: 0, y: -8 }}
                  className="flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="text-xs text-[#6B7280]">Template</div>
                    <div className="font-bold">{selected.title}</div>
                  </div>
                  <div className="flex gap-3 items-end">
                    <label className="grid gap-1.5">
                      <span className="text-xs text-[#6B7280]">Start date</span>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value || todayISO())}
                        className="px-2.5 py-2 border border-[#E5E7EB] rounded-lg"
                      />
                    </label>
                    <label className="grid gap-1.5">
                      <span className="text-xs text-[#6B7280]">Sequential flow</span>
                      <div className="flex items-center gap-2">
                        <input
                          id="wr-seq"
                          type="checkbox"
                          checked={sequential}
                          onChange={(e) => setSequential(e.target.checked)}
                        />
                        <label htmlFor="wr-seq" className="text-[13px] text-[#111827]">
                          Chain tasks by duration
                        </label>
                      </div>
                    </label>
                  </div>
                </motion.div>

                {/* Preview table */}
                <motion.div
                  initial={{ opacity: 0, y: 10, filter: "blur(6px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.45 } }}
                  exit={{ opacity: 0, y: -10, filter: "blur(6px)", transition: { duration: 0.25 } }}
                  className="border border-[#E5E7EB] rounded-lg overflow-hidden"
                >
<table className="w-full border-collapse table-fixed">
  <colgroup>
    <col style={{ width: "56px" }} />     {/* # */}
    <col style={{ width: "22%" }} />      {/* Task title (narrower) */}
    <col style={{ width: "44%" }} />      {/* Description (wider) */}
    <col style={{ width: "10%" }} />      {/* Duration */}
    <col style={{ width: "16%" }} />      {/* Est. due date */}
    <col style={{ width: "12%" }} />      {/* Priority */}
  </colgroup>

  <thead className="bg-[#F5F7FA]">
    <tr>
      {["#", "Task title", "Description", "Duration", "Est. due date", "Priority"].map((h) => (
        <th
          key={h}
          className="text-left px-2.5 py-2 text-xs border-b border-[#E5E7EB]"
        >
          {h}
        </th>
      ))}
    </tr>
  </thead>

  <tbody>
    <AnimatePresence initial={false}>
      {preview.rows.map((r, i) => (
        <motion.tr
          key={r.idx}
          {...fadeListItem(i)}
          className="border-t"
          style={{ borderColor: TK.border }}
        >
          <td className="px-2.5 py-2 text-[13px] align-top">{r.idx}</td>

          {/* Title (compact column) */}
          <td className="px-2.5 py-2 text-[13px] break-words align-top">
            {r.title}
          </td>

          {/* Description (auto-link + wrap) */}
          <td
            className="px-2.5 py-2 text-[13px] break-words align-top"
            dangerouslySetInnerHTML={{ __html: linkifyDesc(r.description) }}
          />

          <td className="px-2.5 py-2 text-[13px] align-top">{r.durationDays}d</td>

          <td className="px-2.5 py-2 text-[13px] align-top">
            {fmtDate(r.estDue)}{" "}
            {r.weekend && (
              <span className="text-[12px]" style={{ color: "#F59E0B" }}>
                • weekend
              </span>
            )}
          </td>

          <td className="px-2.5 py-2 text-[13px] align-top">
            <span
              className="px-2 py-0.5 rounded-full text-[12px]"
              style={{
                border: `1px solid ${
                  r.priority === "High"
                    ? "#EA545555"
                    : r.priority === "Medium"
                    ? "#FF9F4355"
                    : "#6C757D55"
                }`,
                color:
                  r.priority === "High"
                    ? "#EA5455"
                    : r.priority === "Medium"
                    ? "#FF9F43"
                    : "#6C757D",
                background: "#fff",
              }}
            >
              {r.priority}
            </span>
          </td>
        </motion.tr>
      ))}
    </AnimatePresence>
  </tbody>
</table>


                  {/* Summary bar */}
                  <div className="px-2.5 py-2 border-t border-[#E5E7EB] flex items-center justify-between">
                    <div className="text-[13px]">
                      <strong>Total:</strong> {preview.rows.length} task(s) {" · "}
                      <strong>Est. completion:</strong> {fmtDate(preview.lastDue)}
                      {preview.weekendCount > 0 && (
                        <span className="ml-2 text-[13px]" style={{ color: "#F59E0B" }}>
                          {preview.weekendCount} task(s) land on a weekend
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[#6B7280]">Preview is informational; scheduling applies server-side.</div>
                  </div>
                </motion.div>
              </motion.div>
            )}

            {/* Sticky footer actions */}
            {selected && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1, transition: { duration: 0.3 } }}
                exit={{ y: 20, opacity: 0, transition: { duration: 0.2 } }}
                className="sticky bottom-0 right-0 right-0 bg-white border-t"
                style={{ borderColor: TK.borderStrong }}
              >
                <div className="py-2 px-4 flex items-center space-x-2">
                  <button
                    onClick={handleImportTemplate}
                    disabled={!numericCategoryId || !!busy}
                    className="hover:bg-brand-blue1/80 bg-brand-blue1 cursor-pointer px-4 py-1 text-white rounded-md disabled:opacity-60 transition-colors"
                    title="Import template to My Templates"
                  >
                    {busy === "import" ? "Importing…" : "Import Template"}
                  </button>
                  <button
                    onClick={() => {
                      onOpenApply({
                        id: numericCategoryId,
                        template_name: selected?.title,
                        activities: selected?.activities || [],
                      });
                    }}
                    disabled={!numericCategoryId || !!busy}
                    className="px-4 py-1 text-white rounded-md disabled:opacity-60 transition-colors hover:bg-brand-blue1/80 bg-brand-blue1 cursor-pointer"
                    title="Apply template to selected projects"
                  >
                    {busy === "apply" ? "Applying…" : "Apply Template"}
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Loader Overlay */}
        <AnimatePresence>
          {(loading || !!busy) && (
            <motion.div
              key="overlay"
              initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
              animate={{ opacity: 1, backdropFilter: "blur(2px)" }}
              exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
              transition={{ duration: 0.25 }}
              aria-live="polite"
              className="absolute inset-0 grid place-items-center bg-white/65"
            >
              <motion.div
                initial={{ scale: 0.96, opacity: 0 }}
                animate={{ scale: 1, opacity: 1, transition: { duration: 0.25 } }}
                exit={{ scale: 0.96, opacity: 0, transition: { duration: 0.2 } }}
                className="flex items-center gap-2 px-3.5 py-2 rounded-lg border bg-white shadow-lg"
                style={{ borderColor: TK.borderStrong }}
              >
                <Loader2 className="animate-spin" width={18} height={18} />
                <span className="text-[13px]" style={{ color: TK.text }}>
                  {busy === "import"
                    ? "Importing template…"
                    : busy === "apply"
                    ? "Applying template…"
                    : "Loading templates…"}
                </span>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      <Modal
        open={applyOpen}
        onCancel={() => setApplyOpen(false)}
        footer={null}
        width={1000}
        destroyOnClose
        title={`Apply Template: ${applyTpl?.name || "Template"}`}
      >
        <ApplyTemplateModal
          embedded
          applyOpen={true}
          onClose={() => setApplyOpen(false)}
          templateId={applyTpl?.id}
          templateName={applyTpl?.name || "Template"}
          tasksOverride={applyTpl?.tasks || []}
          defaultSequential={true}
          onApplied={({ projects }) => {
            dispatch(fetchMyTemplates() as any);
            dispatch(fetchGlobalTemplates() as any);
            message.success(`Applied to ${projects?.length || 0} project(s).`);
            setApplyOpen(false);
          }}
        />
      </Modal>
    </Drawer>
  );
};
