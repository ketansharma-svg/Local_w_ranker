import React, { useEffect, useMemo, useState } from "react";
import { Modal, Select, Button, Spin } from "antd";
import { motion, AnimatePresence } from "framer-motion";

/**
 * ManageAccessModal — stable version to avoid "Maximum update depth exceeded"
 */
function ManageAccessModal({ member = {}, onClose, onUpdateAccess }) {
  const [loading, setLoading] = useState(false);

  // Build acceptedProjects and make it stable via useMemo
  const acceptedProjects = useMemo(() => {
    const projects = member?.projects || [];
    return projects.filter((p) => p.status === "Accepted");
    // Depend on member id so we only recompute when the member changes
    // (not on object identity of projects which may be recreated)
  }, [member?.user_id ?? member?.id]);

  // Build a stable initial access map (dashboardId -> access) and ensure fallback ids
  const initialAccessMap = useMemo(() => {
    const map = {};
    (member?.projects || []).forEach((p, pIdx) => {
      if (p.status !== "Accepted") return;
      (p.dashboards || []).forEach((d, dIdx) => {
        // create deterministic fallback id if API doesn't provide one
        const fallbackId = `${member?.user_id ?? member?.id ?? "u"}-${p.projectId ?? p.project_id ?? pIdx}-${(d.type || "dash")}-${dIdx}`;
        const id = d.id ?? fallbackId;
        map[id] = (d.access || "viewer").toLowerCase();
      });
    });
    return map;
    // Only recompute when the member identity changes (not on ephemeral array identity)
  }, [member?.user_id ?? member?.id]);

  // Use initialAccessMap as the lazy initial state — avoids calling setState inside effect on mount
  const [localAccess, setLocalAccess] = useState(() => ({ ...initialAccessMap }));

  // If the modal is reopened for a different member, reset localAccess
  useEffect(() => {
    setLocalAccess({ ...initialAccessMap });
    // Only run when the member identity changes — safe and prevents render loops
  }, [member?.user_id ?? member?.id, initialAccessMap]);

  const handleUpdateAccess = async (dashboardId, dashboardType, newAccessLevel) => {
    // Prevent unnecessary updates if the value is unchanged
    if (localAccess[dashboardId] === newAccessLevel) return;

    setLoading(true);
    // optimistic UI update
    setLocalAccess((prev) => ({ ...prev, [dashboardId]: newAccessLevel }));
    try {
      await onUpdateAccess(dashboardId, dashboardType, newAccessLevel);
      // success — nothing else to do (local state already reflects change)
    } catch (error) {
      // rollback to original access from acceptedProjects (if present)
      const original = acceptedProjects
        .flatMap((p) => p.dashboards || [])
        .find((d) => (d.id ?? "").toString() === dashboardId.toString())?.access;
      setLocalAccess((prev) => ({
        ...prev,
        [dashboardId]: (original || "viewer").toLowerCase(),
      }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={
        <div className="flex flex-col">
          <span className="text-lg font-semibold">Manage Access - {member?.name}</span>
          <span className="text-sm text-muted-foreground mt-1">{member?.email}</span>
        </div>
      }
      open={true}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose} disabled={loading}>
          Close
        </Button>,
      ]}
      width={800}
      className="manage-access-modal"
      destroyOnHidden
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="py-4"
      >
        {acceptedProjects.length === 0 ? (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-muted-foreground">
            No accepted projects found for this member.
          </motion.p>
        ) : (
          <div className="space-y-6">
            <AnimatePresence>
              {acceptedProjects.map((project, index) => (
                <motion.div
                  key={project.projectId ?? `${member?.user_id ?? "u"}-${index}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{
                    duration: 0.4,
                    delay: index * 0.1,
                    ease: "easeOut",
                  }}
                  className=" "
                >
                  <h3 className="font-medium mb-2 text-card-foreground">{project.projectName}</h3>

                  <div className="space-y-2">
                    {(project.dashboards || []).map((dashboard, dashIndex) => {
                      const fallbackId = `${member?.user_id ?? member?.id ?? "u"}-${project.projectId ?? project.project_id ?? index}-${
                        dashboard.type ?? "dash"
                      }-${dashIndex}`;
                      const dashId = dashboard.id ?? fallbackId;

                      return (
                        <motion.div
                          key={dashId}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{
                            duration: 0.3,
                            delay: index * 0.1 + dashIndex * 0.05,
                            ease: "easeOut",
                          }}
                          className="flex items-center justify-between py-3 px-2 rounded-md hover:bg-gray-100 transition-colors duration-200 border "
                        >
                          <div className="flex items-center gap-3">
                            <motion.span className=" text-foreground" whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
                              {dashboard.type}
                            </motion.span>
                            <motion.span
                              initial={{ scale: 0.8, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ duration: 0.2, delay: 0.1 }}
                              className={`px-2 py-1 rounded-full text-xs font-medium transition-colors duration-200 ${
                                dashboard.active
                                  ? "bg-green-100 text-green-800"
                                  : "bg-muted text-white"
                              }`}
                            >
                              {dashboard.active ? "Active" : "Inactive"}
                            </motion.span>
                          </div>

                          <motion.div >
                            <Select
                              value={localAccess[dashId]}
                              onChange={(value) => handleUpdateAccess(dashId, dashboard.type, value)}
                              disabled={loading}
                              className="w-32 !text-black"
                              size="small"
                              loading={loading}
                              options={[
                                { value: "viewer", label: "Viewer" },
                                { value: "editor", label: "Editor" },
                                { value: "admin", label: "Admin" },
                              ]}
                            />
                          </motion.div>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center rounded-lg"
          >
            <Spin size="large" />
          </motion.div>
        )}
      </motion.div>
    </Modal>
  );
}

export default ManageAccessModal;
