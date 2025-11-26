"use client";

import * as React from "react";
import { Drawer, Empty, Tag, message, Modal } from "antd";
import { useDispatch } from "react-redux";
import Cookies from "js-cookie";
import { BASE_URL_WR } from "@/src/util/api";
import { fetchMyTemplates } from "@/src/redux/reducer/campaignReducer";
import { ChevronDown, Settings2, Edit3, Trash2 } from "lucide-react";
import { ApplyTemplateModal } from "./ApplyTemplate";
import { fetchGlobalTemplates } from "@/src/redux/reducer/campaignReducer"; // for parity refresh after apply



/** ✅ Animations */
import { AnimatePresence, motion, useReducedMotion, type Transition, type Variants, type TargetAndTransition } from "framer-motion";
import { toast } from "sonner";

type ActivityPreview = {
  id: string | number;
  title: string;
  description?: string;
  is_published?: boolean;
  created_at?: string;
  updated_at?: string;
  is_global?: boolean;
  created_by?: number | string;
};

type TemplateRow = {
  id: string;               // "cat-<categoryId>"
  title: string;            // template/category name
  campaignType: string;     // campaign (e.g., "SEO")
  updatedAt: string;        // ISO
  campaignId?: number | string;
  categoryIsGlobal?: boolean;
  campaignIsGlobal?: boolean;
};

function formatDate(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

/** ---------- Animation helpers ---------- */
const spring: Transition = { type: "spring", stiffness: 260, damping: 24 };
const ease = { type: "tween", ease: [0.22, 1, 0.36, 1], duration: 0.35 };

const fadeLift:any = (delay = 0, reduced = false) => ({
  initial: { opacity: 0, y: reduced ? 0 : 8, filter: "blur(6px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)", transition: { ...ease, delay } },
  exit: { opacity: 0, y: reduced ? 0 : -6, filter: "blur(4px)", transition: { ...ease, duration: 0.25 } },
});

const listItemVariants:any = (reduced = false) => ({
  hidden: (i: number) => ({
    opacity: 0,
    y: reduced ? 0 : 10,
    filter: "blur(6px)",
    transitionEnd: { willChange: "transform, opacity, filter" },
  }),
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { ...ease, delay: Math.min(0.03 * i, 0.3) },
  }),
  exit: {
    opacity: 0,
    y: reduced ? 0 : -8,
    filter: "blur(4px)",
    height: 0,
    marginTop: 0,
    marginBottom: 0,
    paddingTop: 0,
    paddingBottom: 0,
    transition: { ...ease, duration: 0.25 },
  },
});

const shimmerVariants = (reduced = false) => ({
  initial: { opacity: 0, y: reduced ? 0 : 6, filter: "blur(6px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)", transition: { ...ease } },
  exit: { opacity: 0, y: reduced ? 0 : -6, filter: "blur(4px)", transition: { ...ease, duration: 0.2 } },
});

export default function ActivityDrawer({
  open,
  onClose,
  row,
  activities,
  loading,
  startInEditMode = false,
  campaignId: campaignIdProp,
}: {
  open: boolean;
  onClose: () => void;
  row: TemplateRow | null;
  activities: ActivityPreview[];
  loading: boolean;
  startInEditMode?: boolean;
  campaignId?: string | number;
}) {
  const dispatch = useDispatch();
  const accessToken = Cookies.get("login_access_token_wrank") || "";
  const prefersReducedMotion:any = useReducedMotion();

  // local inputs (we NEVER rely on these for list render; store is the source of truth)
  const [campaignName, setCampaignName] = React.useState(row?.campaignType || "");
  const [templateName, setTemplateName] = React.useState(row?.title || "");
  React.useEffect(() => {
    setCampaignName(row?.campaignType || "");
    setTemplateName(row?.title || "");
  }, [row?.id, row?.campaignType, row?.title]);

  // editing a single activity
  const [editId, setEditId] = React.useState<string | null>(null);
  const [editTitle, setEditTitle] = React.useState("");
  const [editDesc, setEditDesc] = React.useState("");

  // manage (rename/delete) open
  const [manageOpen, setManageOpen] = React.useState(!!startInEditMode);
  React.useEffect(() => setManageOpen(!!startInEditMode), [startInEditMode]);

  // busy flags
  const [busyAdd, setBusyAdd] = React.useState(false);
  const [busyManage, setBusyManage] = React.useState<string | null>(null); // "cat" | "campaign"

  // drafts for “Add tasks”
  type Draft = { key: string; title: string; description: string };
  const [drafts, setDrafts] = React.useState<Draft[]>([]);
    const [applyOpen, setApplyOpen] = React.useState(false);
    const [applyTpl, setApplyTpl] = React.useState<{ id?: string; name?: string; tasks?: any[] } | null>(null);
  const validCount = drafts.filter((d) => d.title.trim()).length;

  // ids & global flags
  const catId = React.useMemo(
    () => (row?.id ? Number(String(row.id).replace("cat-", "")) : undefined),
    [row?.id]
  );
  const campaignId = (campaignIdProp ?? (row as any)?.campaignId) as
    | number
    | string
    | undefined;

  const catIsGlobal = !!row?.categoryIsGlobal;
  const campIsGlobal = !!row?.campaignIsGlobal;

  const canManageCampaign = !!campaignId && !campIsGlobal;
  const canManageCategory = !!catId && !catIsGlobal;
  const canAddTasks = !!catId;

  const canSaveDrafts =
    !!row && validCount > 0 && !busyAdd && canAddTasks;

  // base fetch
  const doJSON = (method: string, url: string, body?: any) =>
    fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

 async function extractError(res: Response) {
  try {
    const text = await res.text();
    if (!text) {
      const msg = `HTTP ${res.status}`;
      toast.error(msg);
      return msg;
    }

    try {
      const j = JSON.parse(text);
      const msg =
        j.error ||
        j.detail ||
        j.message ||
        j.non_field_errors?.[0] ||
        `HTTP ${res.status}`;

      // only show toast if it's actually an error response
      if (!res.ok) toast.error(msg);
      return msg;
    } catch {
      if (!res.ok) toast.error(text);
      return text;
    }
  } catch {
    const msg = `HTTP ${res.status}`;
    toast.error(msg);
    return msg;
  }
}

  // activities
  const patchUserActivity = async (
    id: string | number,
    payload: { title: string; description?: string }
  ) => {
    const res = await doJSON(
      "PATCH",
      `${BASE_URL_WR}user-activities/${id}/`,
      payload
    );
  if (!res.ok) throw new Error(await extractError(res));
  };
  const deleteUserActivity = async (id: string | number) => {
    const res = await doJSON("DELETE", `${BASE_URL_WR}user-activities/${id}/`);
  if (!res.ok) throw new Error(await extractError(res));
  };

  // template (category)
  const patchUserCategory = async (id: number | string, name: string) => {
    const res = await doJSON("PATCH", `${BASE_URL_WR}user-categories/${id}/`, {
      name,
    });
  if (!res.ok) throw new Error(await extractError(res));
  };
  const deleteUserCategory = async (id: number | string) => {
    const res = await doJSON("DELETE", `${BASE_URL_WR}user-categories/${id}/`);
  if (!res.ok) throw new Error(await extractError(res));
  };

  // campaign
  const patchUserCampaign = async (id: number | string, name: string) => {
    const res = await doJSON("PATCH", `${BASE_URL_WR}user-campaigns/${id}/`, {
      name,
    });
  if (!res.ok) throw new Error(await extractError(res));
  };
  const deleteUserCampaign = async (id: number | string) => {
    const res = await doJSON("DELETE", `${BASE_URL_WR}user-campaigns/${id}/`);
  if (!res.ok) throw new Error(await extractError(res));
  };

  // save new tasks
  const handleSaveDrafts = async () => {
    if (!row || !canAddTasks) {
      toast.error("Template context missing.");
      return;
    }
    
    const acts = drafts
      .map((d) => ({
        title: d.title.trim(),
        description: (d.description || "").trim(),
      }))
      .filter((a) => a.title.length > 0);
    if (!acts.length) return;
    try {
      setBusyAdd(true);
      const res = await doJSON("POST", `${BASE_URL_WR}create-templates/`, {
        campaign: canManageCampaign ? { name: row.campaignType } : {id:row.campaignId},
        category: { id: catId },
        activities: acts,
      });
      if (!res.ok) throw new Error(await res.text().catch(() => `HTTP ${res.status}`));
      toast.success(`${acts.length} task(s) added.`);
      setDrafts([]);
      dispatch(fetchMyTemplates() as any);
    } catch (e: any) {
      toast.error(e?.message || "Could not add tasks.");
    } finally {
      setBusyAdd(false);
    }
  };

  // single activity editing
  const startEdit = (a: ActivityPreview) => {
    if (a.is_global) {
      toast.warning("This is a global task and cannot be edited.");
      return;
    }
    setEditId(String(a.id));
    setEditTitle(a.title || "");
    setEditDesc(a.description || "");
  };
  const cancelEdit = () => {
    setEditId(null);
    setEditTitle("");
    setEditDesc("");
  };
  const saveEdit = async () => {
    if (!editId) return;
    const target = activities.find((x) => String(x.id) === editId);
    if (!target) return;
    if (target.is_global) {
      toast.warning("Global tasks can’t be edited.");
      cancelEdit();
      return;
    }
    try {
      await patchUserActivity(editId, {
        title: editTitle.trim(),
        description: editDesc,
      });
      toast.success("Activity updated.");
      cancelEdit();
      dispatch(fetchMyTemplates() as any);
    } catch (e: any) {
      toast.error(e?.message || "Failed to update activity.");
    }
  };
  // manage template/campaign (rename/delete) — fully locked when global
  const handleSaveTemplateName = async () => {
    if (!catId || !canManageCategory) {
      toast.info("Global template — rename is disabled.");
      return;
    }
    const v = templateName.trim();
    if (!v) return;
    try {
      setBusyManage("cat");
      await patchUserCategory(catId, v);
      toast.success("Template name updated.");
      dispatch(fetchMyTemplates() as any);
    } catch (e: any) {
      toast.error(e?.message || "Failed to update template name.");
    } finally {
      setBusyManage(null);
    }
  };
  const handleDeleteTemplate = async () => {
    if (!catId || !canManageCategory) {
      toast.info("Global template — delete is disabled.");
      return;
    }
    if (!window.confirm("Delete this template? All its tasks will be removed.")) return;
    try {
      setBusyManage("cat");
      await deleteUserCategory(catId);
      toast.success("Template deleted.");
      dispatch(fetchMyTemplates() as any);
      onClose();
    } catch (e: any) {
      toast.error(e?.message || "Delete failed. It may be global or protected.");
    } finally {
      setBusyManage(null);
    }
  };

  const handleSaveCampaignName = async () => {
    if (!campaignId || !canManageCampaign) {
      toast.info("Global campaign — rename is disabled.");
      return;
    }
    const v = campaignName.trim();
    if (!v) return;
    try {
      setBusyManage("campaign");
      await patchUserCampaign(campaignId, v);
      toast.success("Campaign name updated.");
      dispatch(fetchMyTemplates() as any);
    } catch (e: any) {
      toast.error(e?.message || "Failed to update campaign name.");
    } finally {
      setBusyManage(null);
    }
  };
  const handleDeleteCampaign = async () => {
    if (!campaignId || !canManageCampaign) {
      toast.info("Global campaign — delete is disabled.");
      return;
    }
    if (!window.confirm("Delete this campaign and all its templates?")) return;
    try {
      setBusyManage("campaign");
      await deleteUserCampaign(campaignId);
      toast.success("Campaign deleted.");
      dispatch(fetchMyTemplates() as any);
      onClose();
    } catch (e: any) {
      toast.error(e?.message || "Delete failed. It may be global or protected.");
    } finally {
      setBusyManage(null);
    }
  };

  // disabled styles helper
  const btnBg = (enabled: boolean) => (enabled ? "#008CCD" : "#93C5FD");
  const btnCursor = (enabled: boolean) => (enabled ? "pointer" : "not-allowed");
  const inputStyle = (enabled: boolean) =>
    ({
      borderColor: "#E5E7EB",
      background: enabled ? "#fff" : "#F5F7FA",
      cursor: enabled ? "text" : "not-allowed",
    } as React.CSSProperties);


function onOpenApply() {
  if (!catId) {
    message.error("Template (category) id is missing.");
    return;
  }
  setApplyTpl({
    id: String(catId),                          
    name: row?.title || "Template",     
    tasks: activities || [],             
  });
  setApplyOpen(true);
}


  return (
    <Drawer
      key={row?.id}
      open={open}
      onClose={onClose}
      width={720}
      destroyOnHidden
      maskClosable
      title={
        row ? (
          <motion.div
            {...fadeLift(0, prefersReducedMotion)}
            className="flex items-center gap-2"
          >
            <span className="text-sm px-1.5 py-0.5 rounded border" style={{ borderColor: "#E5E7EB" }}>
              {campaignName}
            </span>
            <span className="font-semibold">{templateName}</span>

            <span className="ml-auto text-xs text-gray-500">Last modified {formatDate(row.updatedAt)}</span>
          </motion.div>
        ) : (
          <motion.span {...fadeLift(0, prefersReducedMotion)}>Template Preview</motion.span>
        )
      }
      footer={
        <>
                      <motion.div className="flex justify-between gap-2 " {...fadeLift(0.02, prefersReducedMotion)}>
  <button
    onClick={onOpenApply}
    disabled={!catId}
    className="px-4 py-1 text-white rounded-md disabled:opacity-60 transition-colors hover:bg-brand-blue1/80 bg-brand-blue1 cursor-pointer"
    title="Apply template to selected projects"
  >
    Apply Template
  </button>

                        <div className=''>
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setDrafts([])}
                  disabled={busyAdd || drafts.length === 0}
                  className="rounded border px-3 py-1 text-sm"
                  style={{
                    borderColor: "#E5E7EB",
                    background: busyAdd || drafts.length === 0 ? "#F5F7FA" : "#fff",
                    cursor: btnCursor(!(busyAdd || drafts.length === 0)),
                  }}
                >
                  Clear
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSaveDrafts}
                  disabled={!canSaveDrafts}
                  className="rounded px-3 py-1 text-sm text-white"
                  style={{
                    background: btnBg(canSaveDrafts),
                    cursor: btnCursor(canSaveDrafts),
                  }}
                  title={
                    !canAddTasks
                      ? "Global template — tasks are read-only"
                      : validCount === 0
                      ? "Add at least one task title"
                      : "Save tasks"
                  }
                >
                  {busyAdd ? "Saving…" : `Save ${validCount} task(s)`}
                </motion.button>
                        </div>

              </motion.div>
        </>
      }
    >
      <AnimatePresence mode="popLayout">
        {!row ? (
          <motion.div key="no-row" {...fadeLift(0.02, prefersReducedMotion)}>
            <Empty description="No template selected" />
          </motion.div>
        ) : (
          <motion.div key="row-present" initial="hidden" animate="show" exit="exit">
            {/* Manage (rename/delete) */}
{/* Manage (rename/delete) */}
<motion.div {...fadeLift(0.03, prefersReducedMotion)} className="mb-2">
  <button
    onClick={() => setManageOpen(o => !o)}
    className="w-full flex items-center gap-2 px-2 py-2 rounded border text-sm text-gray-700 hover:bg-[#FBFDFF]"
    style={{ borderColor: "#EFF0F6", cursor: "pointer" }}
  >
    <Settings2 size={16} color="#008CCD" />
    <span className="font-medium">Manage (rename / delete)</span>
    <ChevronDown
      size={16}
      className="ml-auto transition-transform"
      style={{ transform: manageOpen ? "rotate(180deg)" : "rotate(0deg)" }}
    />
  </button>

  <AnimatePresence initial={false}>
    {manageOpen && (
      <motion.div
        key="manage-body"
        initial={{ height: 0, opacity: 0, filter: "blur(6px)" }}
        animate={{ height: "auto", opacity: 1, filter: "blur(0px)" }}
        exit={{ height: 0, opacity: 0, filter: "blur(4px)" }}
        transition={{ ...ease, duration: 0.35 } as any}
        className="overflow-hidden"
      >
        <div className="grid gap-3 mt-3 mb-4">
          {/* Campaign */}
          <motion.div
            className="p-3 rounded border"
            style={{ borderColor: "#EFF0F6", background: "#fff" }}
            {...fadeLift(0.04, prefersReducedMotion)}
          >
            <div className="text-xs text-gray-500 mb-1">Campaign name</div>
            <div className="flex gap-2">
              <input
                className="flex-1 rounded border px-2 py-1 text-sm"
                style={inputStyle(!!campaignId && !campIsGlobal)}
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder="Campaign name"
                disabled={!canManageCampaign}
                title={!canManageCampaign ? "Global campaign — read-only" : undefined}
              />
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleSaveCampaignName}
                disabled={!canManageCampaign || !campaignName.trim() || busyManage === "campaign"}
                className="inline-flex items-center gap-1 rounded px-3 py-1 text-sm text-white"
                style={{ background: btnBg(canManageCampaign && !!campaignName.trim() && busyManage !== "campaign"),
                         cursor: btnCursor(canManageCampaign && !!campaignName.trim() && busyManage !== "campaign") }}
                title={!canManageCampaign ? "Global campaign — read-only" : undefined}
              >
                <Edit3 size={14}/> Save
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleDeleteCampaign}
                disabled={!canManageCampaign || busyManage === "campaign"}
                className="inline-flex items-center gap-1 rounded border px-3 py-1 text-sm text-red-600"
                style={{ borderColor: "#E5E7EB",
                         background: canManageCampaign ? "#fff" : "#F5F7FA",
                         cursor: btnCursor(canManageCampaign && busyManage !== "campaign") }}
                title={!canManageCampaign ? "Global campaign — read-only" : undefined}
              >
                <Trash2 size={14}/> Delete
              </motion.button>
            </div>
            {!canManageCampaign && <div className="mt-1 text-[11px] text-gray-500">Global campaign — read-only.</div>}
          </motion.div>

          {/* Template (Category) */}
          <motion.div
            className="p-3 rounded border"
            style={{ borderColor: "#EFF0F6", background: "#fff" }}
            {...fadeLift(0.06, prefersReducedMotion)}
          >
            <div className="text-xs text-gray-500 mb-1">Template name</div>
            <div className="flex gap-2">
              <input
                className="flex-1 rounded border px-2 py-1 text-sm"
                style={inputStyle(!!catId && !catIsGlobal)}
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Template (category) name"
                disabled={!canManageCategory}
                title={!canManageCategory ? "Global template — read-only" : undefined}
              />
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleSaveTemplateName}
                disabled={!canManageCategory || !templateName.trim() || busyManage === "cat"}
                className="inline-flex items-center gap-1 rounded px-3 py-1 text-sm text-white"
                style={{ background: btnBg(canManageCategory && !!templateName.trim() && busyManage !== "cat"),
                         cursor: btnCursor(canManageCategory && !!templateName.trim() && busyManage !== "cat") }}
                title={!canManageCategory ? "Global template — read-only" : undefined}
              >
                <Edit3 size={14}/> Save
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleDeleteTemplate}
                disabled={!canManageCategory || busyManage === "cat"}
                className="inline-flex items-center gap-1 rounded border px-3 py-1 text-sm text-red-600"
                style={{ borderColor: "#E5E7EB",
                         background: canManageCategory ? "#fff" : "#F5F7FA",
                         cursor: btnCursor(canManageCategory && busyManage !== "cat") }}
                title={!canManageCategory ? "Global template — read-only" : undefined}
              >
                <Trash2 size={14}/> Delete
              </motion.button>
            </div>
            {!canManageCategory && <div className="mt-1 text-[11px] text-gray-500">Global template — read-only.</div>}
          </motion.div>
        </div>
      </motion.div>
    )}
  </AnimatePresence>
</motion.div>


            {/* Activities list */}
            <AnimatePresence mode="popLayout">
              {loading ? (
                <motion.div key="loading" {...shimmerVariants(prefersReducedMotion) as any} className="space-y-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <motion.div
                      key={i}
                      className="p-3 rounded border"
                      style={{ borderColor: "#EFF0F6", background: "#fff" }}
                      variants={listItemVariants(prefersReducedMotion) as any}
                      initial="hidden"
                      animate="show"
                      custom={i}
                    >
                      <div className="h-4 w-2/3 bg-gray-100 rounded mb-2" />
                      <div className="h-3 w-1/2 bg-gray-100 rounded" />
                    </motion.div>
                  ))}
                </motion.div>
              ) : !activities?.length ? (
                <motion.div key="empty" {...fadeLift(0.02, prefersReducedMotion)}>
                  <Empty description="No activities found in this template" />
                </motion.div>
              ) : (
                <motion.ul
                  key="list"
                  className="space-y-3"
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true, margin: "-40px" }}
                >
                  <AnimatePresence initial={false}>
                    {activities.map((a, idx) => {
                      const inEdit = String(editId) === String(a.id);
                      const nonGlobal = !a.is_global;
                      return (
                        <motion.li
                          key={a.id as any}
                          className="p-3 rounded border hover:bg-[#FBFDFF]"
                          style={{ borderColor: "#EFF0F6", background: "#fff" }}
                          variants={listItemVariants(prefersReducedMotion)}
                          initial="hidden"
                          animate="show"
                          exit="exit"
                          custom={idx}
                          layout
                        >
                          <div className="flex items-start gap-2">
                            <div className="flex-1">
                              <AnimatePresence initial={false} mode="wait">
                                {inEdit ? (
                                  <motion.div
                                    key="edit"
                                    {...fadeLift(0, prefersReducedMotion)}
                                    layout
                                    className="space-y-2"
                                  >
                                    <input
                                      className="rounded border px-2 py-1 text-[14px] w-full"
                                      style={{ borderColor: "#E5E7EB" }}
                                      value={editTitle}
                                      onChange={(e) => setEditTitle(e.target.value)}
                                      placeholder="Task title *"
                                    />
                                    <textarea
                                      className="rounded border px-2 py-1 text-[13px] w-full"
                                      style={{ borderColor: "#E5E7EB" }}
                                      rows={2}
                                      value={editDesc}
                                      onChange={(e) => setEditDesc(e.target.value)}
                                      placeholder="Description (optional)"
                                    />
                                    <div className="flex gap-2 justify-end">
                                      <motion.button
                                        whileTap={{ scale: 0.98 }}
                                        onClick={cancelEdit}
                                        className="rounded border px-3 py-1 text-sm"
                                        style={{ borderColor: "#E5E7EB" }}
                                      >
                                        Cancel
                                      </motion.button>
                                      <motion.button
                                        whileTap={{ scale: 0.98 }}
                                        onClick={saveEdit}
                                        disabled={!editTitle.trim()}
                                        className="rounded px-3 py-1 text-sm text-white"
                                        style={{ background: editTitle.trim() ? "#008CCD" : "#93C5FD", cursor: editTitle.trim() ? "pointer" : "not-allowed" }}
                                      >
                                        Save
                                      </motion.button>
                                    </div>
                                  </motion.div>
                                ) : (
                                  <motion.div
                                    key="read"
                                    {...fadeLift(0, prefersReducedMotion)}
                                    layout
                                  >
                                    <div className="text-[14px] font-medium leading-6">{a.title}</div>
                                    {a.description && (
                                      <div className="text-[13px] text-gray-600 leading-5">{a.description}</div>
                                    )}
                                  </motion.div>
                                )}
                              </AnimatePresence>

                              <motion.div
                                className="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-gray-500"
                                {...fadeLift(0.01, prefersReducedMotion)}
                              >
                                <Tag color={a.is_published ? "green" : "default"}>
                                  {a.is_published ? "Published" : "Draft"}
                                </Tag>
                                {a.is_global ? <Tag>Global</Tag> : <Tag color="blue">Mine</Tag>}
                                {a.created_at && <span>Created: {formatDate(a.created_at)}</span>}
                                {a.updated_at && <span>Updated: {formatDate(a.updated_at)}</span>}
                              </motion.div>
                            </div>

                            {/* actions: only for non-global activities, and when not in edit mode */}
                            {nonGlobal && !inEdit && (
                              <motion.div className="ml-2 flex gap-1" {...fadeLift(0.02, prefersReducedMotion)}>
                                <motion.button
                                  whileTap={{ scale: 0.98 }}
                                  onClick={() => startEdit(a)}
                                  className="rounded border px-2 py-1 text-xs"
                                  style={{ borderColor: "#E5E7EB" }}
                                  title="Edit this task"
                                >
                                  Edit
                                </motion.button>
                                <motion.button
                                  whileTap={{ scale: 0.98 }}
                                  onClick={async () => {
                                    try {
                                      await deleteUserActivity(a.id);
                                      toast.success("Activity deleted.");
                                      dispatch(fetchMyTemplates() as any);
                                    } catch (e: any) {
                                      toast.error(e?.message || "Failed to delete activity.");
                                    }
                                  }}
                                  className="rounded border px-2 py-1 text-xs text-red-600"
                                  style={{ borderColor: "#E5E7EB" }}
                                  title="Delete this task"
                                >
                                  Delete
                                </motion.button>
                              </motion.div>
                            )}
                          </div>
                        </motion.li>
                      );
                    })}
                  </AnimatePresence>
                </motion.ul>
              )}
            </AnimatePresence>

            {/* Add tasks */}
            <motion.div
              className="mt-6 pt-3 border-t "
              style={{ borderColor: "#EFF0F6" }}
              {...fadeLift(0.03, prefersReducedMotion)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="text-[13px] font-medium">Add tasks to this template</div>
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() =>
                    setDrafts((d) => [
                      ...d,
                      { key: Math.random().toString(36).slice(2), title: "", description: "" },
                    ])
                  }
                  className="rounded border px-2 py-1 text-sm"
                  style={{
                    borderColor: "#E5E7EB",
                    background: canAddTasks ? "#fff" : "#F5F7FA",
                    cursor: btnCursor(canAddTasks),
                    opacity: canAddTasks ? 1 : 0.6,
                  }}
                  disabled={false}
                  title={!canAddTasks ? "Global template — tasks are read-only" : "Add a task draft"}
                >
                  + Add Task
                </motion.button>
              </div>

              <AnimatePresence initial={false}>
                {drafts.map((d, idx) => (
                  <motion.div
                    key={d.key}
                    className="p-3 mb-2 rounded border"
                    style={{ borderColor: "#EFF0F6", background: "#fff" }}
                    variants={listItemVariants(prefersReducedMotion)}
                    initial="hidden"
                    animate="show"
                    exit="exit"
                    custom={idx}
                    layout
                  >
                    <div className="grid grid-cols-1 gap-2">
                      <input
                        className="rounded border px-2 py-1 text-[14px]"
                        style={inputStyle(canAddTasks)}
                        placeholder={`Task title ${idx + 1} *`}
                        value={d.title}
                        onChange={(e) =>
                          setDrafts((list) =>
                            list.map((x) => (x.key === d.key ? { ...x, title: e.target.value } : x))
                          )
                        }
                        disabled={false}
                      />
                      <textarea
                        className="rounded border px-2 py-1 text-[13px]"
                        style={inputStyle(canAddTasks)}
                        placeholder="Description (optional)"
                        rows={2}
                        value={d.description}
                        onChange={(e) =>
                          setDrafts((list) =>
                            list.map((x) => (x.key === d.key ? { ...x, description: e.target.value } : x))
                          )
                        }
                        disabled={false}
                      />
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Only the tasks you create here are editable later.</span>
                        <motion.button
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setDrafts((list) => list.filter((x) => x.key !== d.key))}
                          className="text-red-600 hover:underline"
                          disabled={false}
                          style={{ cursor: btnCursor(canAddTasks) }}
                        >
                          Remove
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>



            </motion.div>




          </motion.div>
        )}
      </AnimatePresence>
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
      setApplyOpen(false);
    }}
  />
</Modal>


    </Drawer>
  );
}
