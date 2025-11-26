"use client";
import React, { createContext, useContext, ReactNode, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import type { AppDispatch, RootState } from "../store";
import {
  fetchProjects as fetchProjectsThunk,
  createProject as createProjectThunk,
  updateProject as updateProjectThunk,
  setSelectedProject as setSelectedProjectAction,
  setSelectedButtonId as setSelectedButtonIdAction,
  showModal as showModalAction,
  hideModal as hideModalAction,
} from "../reducer/projectReducer";

// =======================
// Types
// =======================

type ProjectStateSlice = RootState["projectReducer"];
type ProjectEntity = ProjectStateSlice["projects"][number];

export interface ProjectContextType {
  projects: ProjectStateSlice["projects"];
  sharedProjects: ProjectStateSlice["sharedProjects"];
  shared_by_user: ProjectStateSlice["shared_by_user"];
  isModalVisible: ProjectStateSlice["isModalVisible"];
  loading: ProjectStateSlice["loading"];
  selectedProject: ProjectStateSlice["selectedProject"];
  selectedButtonId: ProjectStateSlice["selectedButtonId"];
  createdId: ProjectStateSlice["createdId"];

  showModal: () => void;
  handleCancel: () => void;
  fetchProjects: () => Promise<void>;
  createProject: (postData: Partial<ProjectEntity>) => Promise<void>;
  updateProject: (projectId: string | number, postData: Partial<ProjectEntity>) => Promise<void>;
  setSelectedProject: (project: ProjectStateSlice["selectedProject"]) => void;
  setSelectedButtonId: (id: ProjectStateSlice["selectedButtonId"]) => void;
}

// =======================
// Context
// =======================

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider = ({ children }: { children: ReactNode }) => {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();

  const {
    projects,
    sharedProjects,
    shared_by_user,
    isModalVisible,
    loading,
    selectedProject,
    selectedButtonId,
    createdId,
  } = useSelector((state: RootState) => state.projectReducer);

  const fetchProjects = useCallback(async () => {
    try {
      await dispatch(fetchProjectsThunk()).unwrap();
    } catch (error) {
      console.error("Error fetching projects:", error);
    }
  }, [dispatch]);

  const createProject = useCallback(
    async (postData: Partial<ProjectEntity>) => {
      const payload = { ...postData };
      const analyticsId = payload.analytics_id;
      if (
        analyticsId === undefined ||
        (typeof analyticsId === "string" && analyticsId.trim() === '"')
      ) {
        delete (payload as Record<string, unknown>).analytics_id;
      }

      try {
        await dispatch(
          createProjectThunk({
            postData: payload as any,
            router: router as unknown as any,
          }),
        ).unwrap();
        await fetchProjects();
      } catch (error) {
        console.error("Error creating project:", error);
      } finally {
        dispatch(hideModalAction());
      }
    },
    [dispatch, fetchProjects, router],
  );

  const updateProject = useCallback(
    async (projectId: string | number, postData: Partial<ProjectEntity>) => {
      try {
        await dispatch(
          updateProjectThunk({
            projectId: String(projectId),
            postData: postData as any,
          }),
        ).unwrap();
        await fetchProjects();
      } catch (error) {
        console.error("Error updating project:", error);
      } finally {
        dispatch(hideModalAction());
      }
    },
    [dispatch, fetchProjects],
  );

  const showModal = useCallback(() => {
    dispatch(showModalAction());
  }, [dispatch]);

  const handleCancel = useCallback(() => {
    dispatch(hideModalAction());
  }, [dispatch]);

  const setSelectedProjectHandler = useCallback(
    (project: ProjectStateSlice["selectedProject"]) => {
      dispatch(setSelectedProjectAction(project ?? null));
    },
    [dispatch],
  );

  const setSelectedButtonIdHandler = useCallback(
    (id: ProjectStateSlice["selectedButtonId"]) => {
      dispatch(setSelectedButtonIdAction(id ? String(id) : null));
    },
    [dispatch],
  );

  return (
    <ProjectContext.Provider
      value={{
        projects,
        sharedProjects,
        shared_by_user,
        isModalVisible,
        loading,
        showModal,
        handleCancel,
        fetchProjects,
        createProject,
        updateProject,
        selectedProject,
        setSelectedProject: setSelectedProjectHandler,
        setSelectedButtonId: setSelectedButtonIdHandler,
        selectedButtonId,
        createdId,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};

// =======================
// Hook
// =======================
export const useProjectContext = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error(
      "useProjectContext must be used within a ProjectProvider"
    );
  }
  return context;
};
