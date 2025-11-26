// src/redux/providers/TourProvider.tsx
"use client";

import React, { createContext, useCallback, useContext, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import "driver.js/dist/driver.css";
import { TOUR } from "../tourTargets";

type TourFlow = "teams" | "campaigns" | "quickstart";

type Step = {
  element?: string | Element;
  popover?: {
    title?: string;
    description?: string;
    side?: "top" | "bottom" | "left" | "right";
    align?: "start" | "center" | "end";
  };
  onNextClick?: () => void;
};

type Ctx = {
  startTour: (flow: TourFlow) => Promise<void>;
  isRunning: () => boolean;
  driverRef: React.MutableRefObject<any | null>;
};

const TourCtx = createContext<Ctx | null>(null);
export function useTour() {
  const ctx = useContext(TourCtx);
  if (!ctx) throw new Error("useTour must be used within <TourProvider />");
  return ctx;
}

export function TourProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const driverRef = useRef<any | null>(null);
  const stepsRef = useRef<Step[]>([]);

  const ensureDriver = useCallback(async () => {
    if (driverRef.current) return driverRef.current;
    const { driver } = await import("driver.js");
    driverRef.current = driver({
      showProgress: true,
      overlayOpacity: 0.45,
      stagePadding: 8,
      smoothScroll: true,
      animate: true,
      allowClose: true,
      allowKeyboardControl: true,
onNextClick: () => {
    const drv = driverRef.current;
    const active = drv?.getActiveStep?.();
    // Find matching step to run its onNextClick (if any)
    const idx = stepsRef.current.findIndex((s) => {
      if (!s.element || !active?.element) return false;
      const el =
        typeof s.element === "string"
          ? document.querySelector(s.element as string)
          : (s.element as Element);
      return el === active.element;
    });
    // Run the step-specific callback first (e.g., open a drawer)
    stepsRef.current[idx]?.onNextClick?.();

    // Advance the tour after a short delay so DOM updates can render
    setTimeout(() => drv.moveNext(), 120);
  },

  onPrevClick: () => {
    const drv = driverRef.current;
    // If you ever add per-step 'onPrevClick', call it here before moving back
    drv?.movePrevious();
  },
    });
    return driverRef.current;
  }, []);

  const isRunning = useCallback(
    () => !!driverRef.current?.getState?.().isInitialized,
    []
  );

  const go = useCallback(
    (href: string) => {
      if (location.pathname !== href) router.push(href);
    },
    [router]
  );

  const getSteps = useCallback(
    (flow: TourFlow): Step[] => {
      switch (flow) {
        case "teams":
          return [
            {
              element: TOUR.NAV_TEAMS,
              popover: {
                title: "Teams",
                description: "Create and manage your teams for each campaign.",
                side: "bottom",
              },
              onNextClick: () => go("/team-management"),
            },
            {
              element: TOUR.TEAM_INVITE,
              popover: {
                title: "Invite members",
                description:
                  "Invite colleagues and assign which projects (campaigns) they can access.",
                side: "right",
              },
            },
            {
              element: TOUR.MEMBERS_TABLE,
              popover: {
                title: "Members",
                description:
                  "View all members. Use the menu to change roles or remove access.",
                side: "top",
              },
            },
            {
              element: TOUR.ROLES_PERMISSIONS,
              popover: {
                title: "Roles & permissions",
                description:
                  "Admins manage who can create tasks, edit campaigns and change settings.",
                side: "left",
              },
            },
            {
              element: TOUR.PENDING_INVITES,
              popover: {
                title: "Pending invitations",
                description:
                  "Resend, revoke or update access for pending invites.",
                side: "top",
              },
            },
          ];

        case "campaigns":
          return [
            {
              element: TOUR.NAV_CAMPAIGNS,
              popover: {
                title: "Campaign activity",
                description:
                  "All work is organised under a project (campaign).",
                side: "bottom",
              },
              onNextClick: () => go("/project-task-overview"), // or "/campaign-activity"
            },
            {
              element: TOUR.PROJECT_SELECTOR,
              popover: {
                title: "Project selector",
                description: "Switch between campaigns.",
                side: "bottom",
              },
            },
            {
              element: TOUR.KANBAN,
              popover: {
                title: "Kanban board",
                description:
                  "Drag tasks between statuses. Click a card to open details.",
                side: "left",
              },
            },
            {
              element: TOUR.ADD_TASK,
              popover: {
                title: "Add task",
                description:
                  "Create a task with a due date, assignee and priority.",
                side: "bottom",
              },
              onNextClick: () => {
                const el = document.querySelector(TOUR.ADD_TASK) as
                  | HTMLButtonElement
                  | null;
                el?.click(); // opens creation drawer
              },
            },
            {
              element: TOUR.TASK_DRAWER,
              popover: {
                title: "Task drawer",
                description:
                  "Edit details, attach files, log time and link to a campaign.",
                side: "left",
              },
            },
            {
              element: TOUR.FILTERS,
              popover: {
                title: "Filters",
                description:
                  "Slice by assignee, status, priority, date and more.",
                side: "bottom",
              },
            },
          ];

        case "quickstart":
          return [
            {
              element: TOUR.GLOBAL_SEARCH,
              popover: {
                title: "Universal search",
                description: "Find projects, tasks and pages instantly.",
                side: "bottom",
              },
            },
            {
              element: TOUR.NAV_CAMPAIGNS,
              popover: {
                title: "Campaigns",
                description: "Go here to manage work in each project.",
                side: "bottom",
              },
            },
            {
              element: TOUR.NAV_TEAMS,
              popover: {
                title: "Teams",
                description: "Invite your team and set access.",
                side: "bottom",
              },
            },
          ];
      }
    },
    [go]
  );

  const startTour = useCallback(
    async (flow: TourFlow) => {
      const drv = await ensureDriver();
      stepsRef.current = getSteps(flow);
      await new Promise((r) => setTimeout(r, 60)); // let lazy UI paint
      drv.setSteps(stepsRef.current as any);
      drv.drive();
    },
    [ensureDriver, getSteps]
  );

  const value = useMemo<Ctx>(
    () => ({ startTour, isRunning, driverRef }),
    [startTour, isRunning]
  );

  return <TourCtx.Provider value={value}>{children}</TourCtx.Provider>;
}
