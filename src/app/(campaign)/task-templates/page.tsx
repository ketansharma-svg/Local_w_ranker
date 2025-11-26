"use client"

import dynamic from "next/dynamic";
import React, { useEffect, useMemo, useState } from "react";
import { ApplyTemplateModal } from "./ApplyTemplate";
import {
  selectMyTemplates,
  selectMyTemplatesLoading,
  fetchMyTemplates
} from "@/src/redux/reducer/campaignReducer"
import { AppDispatch, RootState } from "@/src/redux/store";
import { useDispatch, useSelector } from "react-redux";
import { Modal } from "antd";
type CampaignType = "SEO" | "Content" | "Technical" | "Reporting" | "Internal" | "Ads";
type AssignedKind = "unassigned" | "projects" | "groups";
type TemplateRow = {
  id: string;
  title: string;
  campaignType: CampaignType;
  taskCount: number;
  createdBy: { id: string; name: string };
  assignedTo: { kind: AssignedKind; count: number };
  updatedAt: string; // ISO
};
type TemplateTask = { id: string; title: string; durationDays: number; priority: "High" | "Medium" | "Low"; defaultAssigneeId?: string };

const mapCampaign = (name?: string): CampaignType => {
  const n = (name || "").toLowerCase();
  if (n.includes("ads")) return "Ads";
  if (n.includes("content")) return "Content";
  if (n.includes("technical")) return "Technical";
  if (n.includes("report")) return "Reporting";
  return "SEO";
};

type HeaderBarProps = {
  setDrawerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
};

type TemplateBuilderProps = {
  drawerOpen: boolean;
  setDrawerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  onSaved:any
};

// Dynamic imports with SSR disabled
const TemplatesHeaderBarDemo = dynamic<HeaderBarProps>(() => import("./HeaderBar"), { ssr: false });
const TemplatesPanel_FiltersAndTable = dynamic(() => import("./Filters&TemplateTableListView"), { ssr: false });
const TemplateBuilderDemo = dynamic<TemplateBuilderProps>(() => import("./TemplateBuilderDrawer"), { ssr: false });
const TemplateUploadDrawer = dynamic(() => import("./TemplateUpload"), { ssr: false });

const TaskTemplates = () => {
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [open, setOpen] = useState<boolean>(false);
  const [applyOpen, setApplyOpen] = useState(false);

  const dispatch = useDispatch<AppDispatch>()
  const templateData = useSelector((s: RootState) => selectMyTemplates(s))
  const loading = useSelector((s: RootState) => selectMyTemplatesLoading(s))
  useEffect(() => {
    dispatch(fetchMyTemplates())
  }, [dispatch])

const flatCategories = useMemo(() => {
  // tolerate both array and { results: [...] }
  const source = Array.isArray(templateData?.results)
    ? templateData.results
    : Array.isArray(templateData)
      ? templateData
      : [];
  const out: any[] = [];
  source.forEach((camp: any) => {
    const campaignLabel = camp?.campaign_name ?? camp?.name ?? "SEO";
    (camp?.categories || []).forEach((cat: any) => {
      out.push({ ...cat, _campaignName: campaignLabel,   _campaignId: camp?.id,   _campaignGlobal: !!camp?.is_global,   });
    });
  });
  return out;
}, [templateData]);


  // Map categories → table rows
  const rows: TemplateRow[] = useMemo(() => {
    return flatCategories.map((cat: any) => {
      const latest = (cat.activities || []).reduce((acc: string, a: any) => {
        const t = a.updated_at || a.created_at || "";
        return t && (!acc || new Date(t) > new Date(acc)) ? t : acc;
      }, "");

      return {
        id: `cat-${cat.id}`,
        title: cat.template_name ?? cat.name,         
        campaignType: cat._campaignName,      
        campaignId: cat._campaignId,        
        activities: cat.activities,
        taskCount: (cat.activities || []).length,
        createdBy: { id: "system", name: "—" },
        assignedTo: cat?.project_count > 0
          ? { kind: "projects", count: cat.project_count }
          : { kind: "unassigned", count: 0 },
        updatedAt: latest || new Date().toISOString(),
          categoryIsGlobal: !!cat?.is_global,
  campaignIsGlobal: !!cat?._campaignGlobal,
      };
    });
  }, [flatCategories]);

  // Activities → Apply tasks (defaults: 1 day, High for first 2)
  const tasksFromCategory = (cat: any): TemplateTask[] =>
    (cat.activities || []).map((a: any, i: number) => ({
      id: String(a.id),
      title: a.title,
      durationDays: 1,
      priority: i < 2 ? "High" : "Medium",
    }));

  const [selectedTpl, setSelectedTpl] = useState<{ id: string; name: string; tasks: TemplateTask[] } | null>(null);

  const handleApplyFromTable = (rowId: string) => {
    const catId = Number(String(rowId).replace("cat-", ""));
    const cat = flatCategories.find((c: any) => c.id === catId);
    if (!cat) return;
    setSelectedTpl({
      id: String(catId),
      name: cat.template_name,
      tasks: tasksFromCategory(cat),
    });
    setApplyOpen(true);
  };


  return (
    <>
      <TemplatesHeaderBarDemo setDrawerOpen={setDrawerOpen} setOpen={setOpen} />
      <TemplatesPanel_FiltersAndTable setApplyOpen={setApplyOpen} data={rows} onApply={handleApplyFromTable} />

      <TemplateBuilderDemo drawerOpen={drawerOpen} setDrawerOpen={setDrawerOpen} onSaved={() => dispatch(fetchMyTemplates())}  />

      <Modal
        open={applyOpen}
        onCancel={() => setApplyOpen(false)}
        footer={null}
        width={1000}
        destroyOnClose
        title={`Apply Template: ${selectedTpl?.name || "Template"}`}
      >
        <ApplyTemplateModal
          embedded
          applyOpen={true}              
          onClose={() => setApplyOpen(false)}
          templateId={selectedTpl?.id}
          templateName={selectedTpl?.name || "Template"}
          tasksOverride={selectedTpl?.tasks}
          defaultSequential={true}
          onApplied={() => {
            dispatch(fetchMyTemplates());
            setApplyOpen(false);
          }}
        />
      </Modal>

      <TemplateUploadDrawer
        open={open}
        setOpen={setOpen}
        onSaved={() => dispatch(fetchMyTemplates())} 
      />    </>
  );
};

export default TaskTemplates;
