"use client";
import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import UniversalTaskCreationDrawer from "@/src/app/(campaign)/project-task-overview/UniversalTaskCreationDrawer";

// ——— Types
type OpenOpts = {
  title?: string;
  projectId?: string | number | null;
  description?: string;
  lockProject?: boolean; // if true, project selector stays disabled
  type?: "createNew" | "edit"; // keeps parity with your drawer API
};

type TaskDrawerState = {
  open: boolean;
  title: string;
  projectId: string | number | null;
  description?: string;
  lockProject?: boolean;
  type: "createNew" | "edit";
};

type Ctx = {
  openTaskDrawer: (opts?: OpenOpts) => void;
  openTaskWithSelectedProject: (title?: string) => void;
  closeTaskDrawer: () => void;
};

// ——— Context
const TaskDrawerContext = createContext<Ctx | null>(null);

// ——— Provider
export function TaskDrawerProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<TaskDrawerState>({
    open: false,
    title: "",
    projectId: null,
    description: "",
    lockProject: false,
    type: "createNew",
  });

  const closeTaskDrawer = useCallback(() => {
    setState(s => ({ ...s, open: false }));
  }, []);

  const openTaskDrawer = useCallback((opts?: OpenOpts) => {
    setState(s => ({
      ...s,
      open: true,
      title: opts?.title ?? "",
      projectId: opts?.projectId ?? null,
      description: opts?.description ?? "",
      lockProject: !!opts?.lockProject,
      type: opts?.type ?? "createNew",
    }));
  }, []);

  // Optional convenience if you use a global selectedProject hook
  // Adjust the import path to your existing hook:
  // import { useProjectManager } from "@/src/hooks/use-project-manager";
  // const { selectedProject } = useProjectManager();
  // and then wire it here, or keep it simple and pass projectId where you call openTaskDrawer.

  const value = useMemo<Ctx>(() => ({
    openTaskDrawer,
    openTaskWithSelectedProject: (title?: string) => openTaskDrawer({ title }), // pass projectId at call-site if needed
    closeTaskDrawer,
  }), [openTaskDrawer, closeTaskDrawer]);

  return (
    <TaskDrawerContext.Provider value={value}>
      {children}

      {/* Mounted once globally */}
      <UniversalTaskCreationDrawer
        open={state.open}
        onClose={closeTaskDrawer}
        defaultTitle={state.title}
        defaultDesc={state.description}
        idPassed={state.projectId}
        type={state.type}

      />
    </TaskDrawerContext.Provider>
  );
}

// ——— Hook
export function useTaskDrawer() {
  const ctx = useContext(TaskDrawerContext);
  if (!ctx) throw new Error("useTaskDrawer must be used within <TaskDrawerProvider>");
  return ctx;
}
