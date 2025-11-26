import React, { useEffect, useMemo, useRef, useState } from "react";
import { Drawer, Modal, Popover, Spin } from "antd";
import { useDispatch } from "react-redux";
import { fetchMyTemplates } from "@/src/redux/reducer/campaignReducer";
import { Plus, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Cookies from "js-cookie";
import { BASE_URL_WR } from "@/src/util/api";
import { toast } from "sonner";
import { IoDuplicate } from "react-icons/io5";
import { RxCross2 } from "react-icons/rx";


const TK = {
  brand: "#008CCD",
  brandHover: "#007DB3",
  text: "#111827",
  muted: "#6B7280",
  borderStrong: "#E5E7EB",
  borderLight: "#EFF0F6",
  bg: "#FFFFFF",
  subtle: "#F5F7FA",
  focus: "#D2EFFF",
  danger: "#EA5455",
  warn: "#FF9F43",
  gray: "#9CA3AF",
  radius: 8,
  z: 1200,
};

const accessToken = Cookies.get("login_access_token_wrank");

async function apiFetch(path, init) {
  const url = path.startsWith("http") ? path : BASE_URL_WR + path.replace(/^\/+/, "");
  const res = await fetch(url, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    ...init,
  });
  if (!res.ok) {
    let text = "";
    try {
      text = await res.text();
    } catch { }
    throw new Error(text || res.statusText || "Request failed");
  }
  return res.status === 204 ? null : res.json();
}

const uid = () => Math.random().toString(36).slice(2, 9);
const clamp = (n, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, n));

const Th = ({ children, style }) => (
  <div
    role="columnheader"
    style={{
      position: "sticky",
      top: 0,
      background: TK.bg,
      zIndex: 1,
      borderBottom: `1px solid ${TK.borderStrong}`,
      fontWeight: 600,
      fontSize: 12,
      padding: "8px 10px",
      ...style,
    }}
  >
    {children}
  </div>
);

const Chip = ({ children, onRemove, title }) => (
  <span
    title={title}
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      background: TK.subtle,
      border: `1px solid ${TK.borderLight}`,
      padding: "4px 8px",
      borderRadius: 999,
      fontSize: 12,
    }}
  >
    {children}
    {onRemove && (
      <button
        aria-label="remove"
        onClick={onRemove}
        style={{ border: "none", background: "transparent", cursor: "pointer", color: TK.muted }}
      >
        ×
      </button>
    )}
  </span>
);

const makeRow = (i) => ({
  id: uid(),
  order: i + 1,
  title: i === 0 ? "Kickoff Meeting" : "",
  description: "",
});

export default function TemplateBuilderDemo({ drawerOpen, setDrawerOpen, onSaved }) {
  const dispatch = useDispatch();

  const [title, setTitle] = useState("");
  const [tags, setTags] = useState([]);
  const [tagDraft, setTagDraft] = useState("");
  const [notes, setNotes] = useState("");
  const [tasks, setTasks] = useState(Array.from({ length: 3 }, (_, i) => ({ ...makeRow(i) })));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const [categories, setCategories] = useState([]);
  const [campaignId, setCampaignId] = useState(null);
  const [isCustomCampaign, setIsCustomCampaign] = useState(false);
  const [customCampaignName, setCustomCampaignName] = useState("");

  useEffect(() => {
    if (!drawerOpen) return;
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
        toast.error("Could not load campaigns.");
      }
    })();
  }, [drawerOpen]);

  // Dedupe campaigns by CampaignName (id) → name
  const campaignOptions = useMemo(() => {
    const byId = new Map();
    categories.forEach((c) => {
      const id = c.CampaignName;
      const name = c.campaign_name;
      if (id && name && !byId.has(id)) byId.set(id, { id, name });
    });
    return Array.from(byId.values());
  }, [categories]);

  // Validation
  const rowErrors = useMemo(() => {
    const errs = new Map();
    tasks.forEach((r) => {
      const list = [];
      if (!r.title?.trim()) list.push("Task title can't be empty.");
      if (list.length) errs.set(r.id, list);
    });
    return errs;
  }, [tasks]);

  const campaignValid = isCustomCampaign ? customCampaignName.trim().length > 0 : !!campaignId;
  const isValid = title.trim().length > 0 && tasks.length > 0 && rowErrors.size === 0 && campaignValid && !saving;

  useEffect(() => {
    setDirty(true);
  }, [title, tags, notes, tasks, campaignId, isCustomCampaign, customCampaignName]);

  // Grid ops
  const renumber = (rows) => rows.map((r, i) => ({ ...r, order: i + 1 }));
  const addRow = () => setTasks((prev) => renumber([...prev, makeRow(prev.length)]));
  const duplicateRow = (idx) =>
    setTasks((prev) => {
      const r = prev[idx];
      const copy = { ...r, id: uid() };
      const next = [...prev.slice(0, idx + 1), copy, ...prev.slice(idx + 1)];
      return renumber(next);
    });
  const deleteRow = (idx) => setTasks((prev) => renumber(prev.filter((_, i) => i !== idx)));
  const moveRow = (idx, dir) =>
    setTasks((prev) => {
      const to = clamp(idx + dir, 0, prev.length - 1);
      if (to === idx) return prev;
      const next = [...prev];
      const [item] = next.splice(idx, 1);
      next.splice(to, 0, item);
      return renumber(next);
    });
  const updateRow = (idx, patch) =>
    setTasks((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });

  // DnD
  const dragIndex = useRef(null);
  const onDragStart = (i) => (e) => {
    dragIndex.current = i;
    e.dataTransfer.effectAllowed = "move";
  };
  const onDragOver = (i) => (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };
  const onDrop = (i) => (e) => {
    e.preventDefault();
    const from = dragIndex.current;
    if (from == null) return;
    moveRow(from, i - from);
    dragIndex.current = null;
  };

  // Virtual window
  const gridBodyRef = useRef(null);
  const [windowRange, setWindowRange] = useState([0, 60]);
  useEffect(() => {
    const el = gridBodyRef.current;
    if (!el) return;
    const onScroll = () => {
      const rowH = 64; // taller now due to textarea
      const start = Math.floor(el.scrollTop / rowH) - 6;
      const visible = Math.ceil(el.clientHeight / rowH) + 12;
      setWindowRange([clamp(start, 0, tasks.length), clamp(start + visible, 0, tasks.length)]);
    };
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, [tasks.length]);
  const visibleRows = tasks.length > 40 ? tasks.slice(windowRange[0], windowRange[1]) : tasks;
  const padTop = tasks.length > 40 ? windowRange[0] * 64 : 0;
  const padBottom = tasks.length > 40 ? Math.max(0, (tasks.length - windowRange[1]) * 64) : 0;

  // Header
  const headerJSX = (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, color: TK.text, marginBottom: 4, fontWeight: 600 }}>Template Title <span className="text-red-500">*</span></div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Template title…"
            aria-invalid={!title.trim()}
            disabled={saving}
            style={{
              width: "100%",
              padding: "8px 10px",
              borderRadius: 6,
              border: `1px solid ${!title.trim() ? TK.danger : TK.borderStrong}`,
              outline: "none",
            }}
            onFocus={(e) => (e.currentTarget.style.boxShadow = `0 0 0 3px ${TK.focus}`)}
            onBlur={(e) => (e.currentTarget.style.boxShadow = "none")}
          />
          {!title.trim() && (
            <div style={{ color: TK.danger, fontSize: 12, marginTop: 4 }}>Template title is required.</div>
          )}
        </div>
      </div>


      <div className="flex gap-12 w-full">
        {/* Campaign Type with Add custom… */}
        <label className="w-full flex gap-4 pt-4 items-center">
          <span style={{ fontSize: 12, fontWeight: 600 }}>Campaign Type</span>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <select
              value={isCustomCampaign ? "__custom__" : (campaignId ?? "")}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "__custom__") {
                  setIsCustomCampaign(true);
                  setCustomCampaignName("");
                  setCampaignId(null);
                } else {
                  setIsCustomCampaign(false);
                  setCustomCampaignName("");
                  setCampaignId(Number(v));
                }
              }}
              disabled={saving}
              style={{ padding: "8px 10px", borderRadius: 6, border: `1px solid ${TK.borderStrong}` }}
            >
              {campaignOptions.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
              <option value="__custom__">➕ Add custom…</option>
            </select>


            {isCustomCampaign && (
              <input
                value={customCampaignName}
                onChange={(e) => setCustomCampaignName(e.target.value)}
                placeholder="Enter custom campaign name"
                disabled={saving}
                className="w-full"
                style={{
                  flex: 1,
                  minWidth: 160,
                  padding: "8px 10px",
                  borderRadius: 6,
                  border: `1px solid ${customCampaignName.trim() ? TK.borderStrong : TK.danger}`,
                }}
              />
            )}
          </div>
          {isCustomCampaign && !customCampaignName.trim() && (
            <div style={{ color: TK.danger, fontSize: 12, marginTop: 4 }}>Custom name is required.</div>
          )}
        </label>

      </div>

    </div>
  );

  const bodyJSX = (
    <div>
      {/* Tasks */}
      <section style={{ padding: 16 }}>
        <div style={{ fontSize: 16, fontWeight: 600, margin: "0 0 12px" }}>Tasks ({tasks.length})</div>
        {tasks.length === 0 ? (
          <div
            style={{ padding: 16, border: `1px dashed ${TK.borderStrong}`, borderRadius: 8, background: TK.subtle }}
          >
            Start by adding your first task (Title + Description).
          </div>
        ) : (
          <div style={{ border: `1px solid ${TK.borderStrong}`, borderRadius: 8, overflow: "hidden" }}>
            {/* header row: # | Title | Description | Actions */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "48px 1.2fr 2fr 84px",
                alignItems: "center",
                background: "#FAFAFA",
              }}
            >
              <Th>#</Th>
              <Th>Task Title <span className="text-red-500">*</span></Th>
              <Th>Description</Th>
              <Th>Actions</Th>
            </div>

            {/* body (virtualised + animated) */}
            <div ref={gridBodyRef} style={{ maxHeight: 420, overflow: "auto" }}>
              <div style={{ height: padTop }} />
              <AnimatePresence initial={false}>
                {visibleRows.map((row, vi) => {
                  const idx = tasks.findIndex((r) => r.id === row.id);
                  const errs = rowErrors.get(row.id) || [];                  
                  const delay = (idx % 8) * 0.025; // index-based stagger
                  return (
                    <motion.div
                      key={row.id}
                      data-rowid={row.id}
                      draggable={!saving}
                      onDragStart={onDragStart(idx)}
                      onDragOver={onDragOver(idx)}
                      onDrop={onDrop(idx)}
                      initial={{ opacity: 0, filter: "blur(6px)", y: 6 }}
                      animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
                      exit={{ opacity: 0, filter: "blur(6px)", y: -6 }}
                      transition={{ duration: 0.28, ease: "easeOut", delay }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ amount: 0.3, once: true }}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "48px 1.2fr 2fr 84px",
                        alignItems: "stretch",
                        borderTop: `1px solid ${TK.borderLight}`,
                        minHeight: 64,
                        background: "transparent",
                      }}
                    >
                      {/* handle + order */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "6px 10px",
                        }}
                      >
                        <button
                          title="Drag to reorder"
                          aria-label="drag handle"
                          disabled={saving}
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: 6,
                            border: `1px solid ${TK.borderLight}`,
                            background: TK.subtle,
                            cursor: saving ? "not-allowed" : "grab",
                          }}
                        >
                          ⋮⋮
                        </button>
                        <span style={{ fontVariantNumeric: "tabular-nums" }}>{row.order}</span>
                      </div>

                      {/* title */}
                      <div style={{ padding: "6px 10px", display: "flex", flexDirection:"column"}}>
                        <input
                          value={row.title}
                          onChange={(e) => updateRow(idx, { title: e.target.value.slice(0, 200) })}
                          placeholder="Write task title…"
                          disabled={saving}
                          style={{
                            width: "100%",
                            padding: "8px 10px",
                            borderRadius: 6,
                            border: `1px solid ${errs.length ? TK.danger : TK.borderStrong}`,
                          }}
                        />
                          {errs.length > 0 && (
    <div style={{ color: TK.danger, fontSize: 13, marginTop: 4 }}>
      {errs[0]}
    </div>
  )}
                      </div>

                      {/* description */}
                      <div style={{ padding: "6px 10px", display: "flex", alignItems: "center" }}>
                        <textarea
                          value={row.description}
                          onChange={(e) => updateRow(idx, { description: e.target.value })}
                          placeholder="Add a helpful description…"
                          rows={2}
                          disabled={saving}
                          style={{
                            width: "100%",
                            padding: "8px 10px",
                            borderRadius: 6,
                            border: `1px solid ${TK.borderStrong}`,
                            resize: "vertical",
                          }}
                        />
                      </div>

                      {/* actions */}
                      <div
                        style={{
                          padding: "6px 10px",
                          display: "flex",
                          gap: 8,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Popover content="Duplicate">
                          <button
                            onClick={() => duplicateRow(idx)}
                            disabled={saving}
                            className="px-2 py-1 border rounded text-brand-blue1 border-brand-blue1"
                          >
                            <IoDuplicate />
                          </button>
                        </Popover>
                        <Popover content="Delete">

                          <button

                            onClick={() => deleteRow(idx)}
                            disabled={saving}
                            className="px-2 py-1 border rounded text-[#EA5455] border-[#EA5455]"
                          >
                            <RxCross2 />
                          </button>
                        </Popover>

                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              <div style={{ height: padBottom }} />
            </div>

            {/* add row */}
            <div
              style={{
                padding: 12,
                borderTop: `1px solid ${TK.borderLight}`,
                background: "#FAFAFA",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ color: TK.muted, fontSize: 12 }}>Tip: drag to reorder • duplicate to speed up.</div>
              <button
                onClick={addRow}
                disabled={saving}
                style={{
                  padding: "8px 12px",
                  borderRadius: 6,
                  border: `1px solid ${TK.borderStrong}`,
                  background: "transparent",
                  cursor: saving ? "not-allowed" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Plus size={16} /> Add Task
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );

  const resetForm = () => {
    setTitle("");
    setTags([]);
    setTagDraft("");
    setNotes("");
    setTasks(Array.from({ length: 3 }, (_, i) => ({ ...makeRow(i) })));
    setDirty(false);
    setSaving(false);
    // reset campaign choice to default list item
    if (categories?.length) {
      const first = categories[0];
      setCampaignId(first?.CampaignName ?? null);
    } else {
      setCampaignId(null);
    }
    setIsCustomCampaign(false);
    setCustomCampaignName("");
  };


  const onSave = async () => {
    if (!isValid) return;
    try {
      setSaving(true);

      const activities = tasks
        .map((t) => ({
          title: (t.title || "").trim(),
          description: (t.description || "").trim(),
        }))
        .filter((a) => a.title.length > 0);

      if (!activities.length) {
        toast.error("Add at least one task with a title.");
        setSaving(false);
        return;
      }

      const customName = (customCampaignName || "").trim();
      const campaign =
        isCustomCampaign && customName
          ? { name: customName }
          : campaignId
            ? { id: campaignId }
            : null;

      if (!campaign) {
        toast.error("Select a Campaign Type or enter a custom campaign name.");
        setSaving(false);
        return;
      }

      const payload = {
        campaign,
        category: { name: title.trim() },
        activities,
      };

      await apiFetch("create-templates/", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      toast.success("Template created.");
      onSaved?.();
      resetForm();
      setDrawerOpen(false);

    } catch (e) {
      toast.error("Could not create template.");
    } finally {
      setSaving(false);
    }
  };


  return (
    <Drawer
      width={900}
      open={drawerOpen}
      onClose={() => { resetForm(); setDrawerOpen(false); }}
      destroyOnHidden
      bodyStyle={{ padding: 0 }}
      closable={true}
      title="Create Template"
      footer={
        <div
          style={{
            padding: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ fontSize: 12, color: dirty ? TK.text : TK.muted }}>
            {dirty ? "Unsaved changes" : "—"}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => { resetForm(); setDrawerOpen(false); }}
              disabled={saving}
              style={{
                padding: "8px 12px",
                borderRadius: 6,
                border: `1px solid ${TK.borderStrong}`,
                background: "transparent",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              disabled={!isValid}
              className="disabled:!cursor-not-allowed"
              style={{
                padding: "8px 12px",
                borderRadius: 6,
                border: "none",
                background: isValid ? TK.brand : TK.borderStrong,
                color: isValid ? "#fff" : TK.muted,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              {saving && <Spin size="small" />}
              Save Template
            </button>
          </div>
        </div>
      }
    >
      {/* Header and Body (with subtle entrance) */}
      <motion.div
        initial={{ opacity: 0, filter: "blur(6px)", y: 6 }}
        animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        {headerJSX}
      </motion.div>
      <motion.div
        initial={{ opacity: 0, filter: "blur(6px)", y: 6 }}
        animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut", delay: 0.05 }}
      >
        {bodyJSX}
      </motion.div>
    </Drawer>
  );
}
