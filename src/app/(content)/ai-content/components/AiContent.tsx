"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { AiWriterHeader } from "./AiWriterHeader";
import WriterAutomatedBody from "./WriterAutomated";
import type { ProjectInfo, WriterInputs } from "@/src/lib/ai/writer-schema";
import { defaultInputs } from "@/src/lib/ai/writer-schema";
import { useProjectManager } from "@/src/hooks/use-project-manager";

type ProjectManagerProject = ReturnType<typeof useProjectManager>["projects"][number];

const toProjectInfo = (project?: ProjectManagerProject | null): ProjectInfo | null => {
  if (!project) return null;
  const domain = String(project.domain || project.url || project.name || "");
  const derivedName = String(project.name || domain || "Untitled Project");
  const idSource = project.id ?? project.project_id ?? domain ?? derivedName;
  if (!idSource) return null;
  return {
    id: String(idSource),
    name: derivedName,
    domain,
  };
};

const cloneInputs = (source: WriterInputs): WriterInputs => ({
  ...source,
  keywords: [...source.keywords],
  competitors: [...source.competitors],
  attachments: source.attachments.map((file) => ({ ...file })),
  policy: { ...source.policy },
});

const createInputsState = (): WriterInputs => cloneInputs(defaultInputs);

export default function AiContents() {
  const [inputs, setInputs] = useState<WriterInputs>(() => createInputsState());
  const [templates, setTemplates] = useState<{ name: string; snapshot: WriterInputs }[]>([]);
  const [defaultTemplateName, setDefaultTemplateName] = useState<string | undefined>(undefined);
  const writerRef:any = useRef<any>(null);

  const templateNames = useMemo(() => templates.map((t) => t.name), [templates]);
  const { projects: managedProjects, sharedProjects, selectedProject, selectProject } = useProjectManager();
  const projectSources = useMemo(() => [...managedProjects, ...sharedProjects], [managedProjects, sharedProjects]);
  const normalizedProjects = useMemo(
    () => projectSources.map(toProjectInfo).filter((info): info is ProjectInfo => Boolean(info)),
    [projectSources]
  );
  const project = useMemo(() => {
    const base = selectedProject ?? projectSources[0] ?? null;
    return toProjectInfo(base);
  }, [projectSources, selectedProject]);
  const handleProjectChange = useCallback(
    (id: string | null) => {
      if (!id) return;
      const next = projectSources.find((candidate) => String(candidate.id) === String(id));
      if (next) {
        selectProject(next);
      }
    },
    [projectSources, selectProject]
  );

  const handleSaveTemplate = useCallback(
    (name: string) => {
      setTemplates((prev) => {
        const filtered = prev.filter((t) => t.name !== name);
        return [...filtered, { name, snapshot: cloneInputs(inputs) }];
      });
    },
    [inputs]
  );

  const handleLoadTemplate = useCallback(
    (name: string) => {
      const matched = templates.find((t) => t.name === name);
      if (matched) setInputs(cloneInputs(matched.snapshot));
    },
    [templates]
  );

  const handleGenerate = useCallback(() => {
    writerRef.current?.triggerGenerate();
  }, []);

  const handleReset = useCallback(() => {
    setInputs(createInputsState());
    writerRef.current?.resetView();
  }, []);

  return (
    <div className="space-y-4">
      <AiWriterHeader
        project={project ?? null}
        projects={normalizedProjects}
        templates={templateNames}
        defaultTemplateName={defaultTemplateName}
        valueContentType={inputs.contentType || undefined}
        valueLocale={inputs.locale}
        valueTone={inputs.tone}
        valueAudience={inputs.audience}
        valueAeoIntent={inputs.aeoIntent}
        onProjectChange={handleProjectChange}
        onContentTypeChange={(contentType) => setInputs((prev) => ({ ...prev, contentType }))}
        onLocaleChange={(locale) => setInputs((prev) => ({ ...prev, locale }))}
        onToneChange={(tone) => setInputs((prev) => ({ ...prev, tone }))}
        onAudienceChange={(audience) => setInputs((prev) => ({ ...prev, audience }))}
        onAeoIntentChange={(aeoIntent) => setInputs((prev) => ({ ...prev, aeoIntent }))}
        onGenerate={handleGenerate}
        onReset={handleReset}
        onSaveTemplate={handleSaveTemplate}
        onLoadTemplate={handleLoadTemplate}
        onDeleteTemplate={(name) => setTemplates((prev) => prev.filter((t) => t.name !== name))}
        onSetDefaultTemplate={(name) => setDefaultTemplateName(name)}
        onOpenHelp={() => console.info("Open help")}
        onImport={() => console.info("Import brief")}
        onExport={() => writerRef.current?.exportDraft()}
        onShare={() => writerRef.current?.shareDraft()}
        onOpenSettings={() => console.info("Open settings")}
      />
        <WriterAutomatedBody
          ref={writerRef}
          project={project ?? null}
          valueInputs={inputs}
          onInputsChange={(next) => setInputs(cloneInputs(next))}
          onGenerate={() => console.info("Generate triggered")}
          onCancelStream={() => console.info("Cancel stream")}
          onPauseStream={() => console.info("Pause stream")}
          onPartialRerun={(reason) => console.info("Partial rerun", reason)}
          onOpenCanvas={() => console.info("Open canvas")}
          onSaveDraft={() => console.info("Save draft")}
          onExport={() => console.info("Export draft")}
          onShare={() => console.info("Share draft")}
          onProjectClick={() => console.info("Project click")}
        />
    </div>
  );
}
