'use client';

import React, { useCallback, useRef, useState } from "react";
import { Link2, RefreshCcw, Upload, X } from "lucide-react";
import { ATTACHMENT_MAX_BYTES, isSupportedAttachment, readAttachmentFile } from "@/src/lib/files/attachment-reader";
import type { WriterAttachment } from "@/src/lib/ai/writer-schema";
import { GhostButton, PulseBlock, SecondaryButton } from "./primitives";
import { TK, nf } from "./shared";
import { faviconFor, isValidUrl } from "./utils";

export function UrlList({
  value,
  onAdd,
  onRemove,
}: {
  value: string[];
  onAdd: (u: string) => void;
  onRemove: (u: string) => void;
}) {
  const [q, setQ] = useState("");
  const valid = !q || isValidUrl(q);
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <input
          className="h-10 flex-1 rounded-md border px-3 text-sm outline-none focus-visible:outline"
          style={{ borderColor: valid ? TK.border : TK.critical, outlineColor: TK.focus }}
          placeholder="https://example.com/article..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <SecondaryButton
          onClick={() => {
            if (isValidUrl(q)) {
              onAdd(q);
              setQ("");
            }
          }}
        >
          <Link2 size={16} style={{ color: TK.brand }} />
          Add
        </SecondaryButton>
      </div>
      <div className="flex flex-wrap gap-2">
        {value.map((u) => (
          <span key={u} className="inline-flex items-center gap-2 rounded-full border px-2 py-1 text-xs" style={{ borderColor: TK.border, color: TK.text }}>
            <img className="h-4 w-4 rounded" src={faviconFor(u)} alt="" />
            <span className="max-w-[280px] truncate">{u}</span>
            <button className="cursor-pointer" onClick={() => onRemove(u)} aria-label="Remove URL">
              <X size={14} />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}

export function AttachmentList({
  files,
  onAdd,
  onRemove,
}: {
  files: WriterAttachment[];
  onAdd: (fs: WriterAttachment[]) => void;
  onRemove: (id: string) => void;
}) {
  const ref = useRef<HTMLInputElement | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const maxLabel = Math.floor(ATTACHMENT_MAX_BYTES / (1024 * 1024));

  const processFiles = useCallback(
    async (list: File[]) => {
      if (!list.length) return;
      const eligible = list.filter(isSupportedAttachment);
      if (!eligible.length) {
        setError(`Only PDF, DOCX, or Markdown files up to ${maxLabel}MB are supported.`);
        return;
      }
      setProcessing(true);
      setError(null);
      const results = await Promise.allSettled(eligible.map((file) => readAttachmentFile(file)));
      const fulfilled = results.filter((r): r is PromiseFulfilledResult<WriterAttachment> => r.status === "fulfilled").map((r) => r.value);
      const rejected = results.filter((r) => r.status === "rejected");
      if (fulfilled.length) onAdd(fulfilled);
      if (rejected.length) setError(`Couldn't read ${rejected.length} file${rejected.length === 1 ? "" : "s"}. Try another format.`);
      setProcessing(false);
    },
    [maxLabel, onAdd]
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      if (processing) return;
      const candidates = Array.from(event.dataTransfer.files || []);
      if (candidates.length) processFiles(candidates);
    },
    [processing, processFiles]
  );

  const handleBrowse = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (processing) {
        event.currentTarget.value = "";
        return;
      }
      const selected = Array.from(event.target.files || []);
      if (selected.length) processFiles(selected);
      event.currentTarget.value = "";
    },
    [processing, processFiles]
  );

  return (
    <div>
      <div
        className="grid place-items-center rounded-md border p-4 text-center"
        style={{ borderColor: TK.border, color: TK.text, background: "#FCFDFE" }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        <div className="text-sm">Drag & drop files here</div>
        <div className="mt-1 text-[12px]" style={{ color: TK.textMuted }}>
          Accepted: .pdf, .docx, .md - up to {maxLabel}MB each
        </div>
        <div className="mt-2">
          <SecondaryButton onClick={() => ref.current?.click()} disabled={processing}>
            <Upload size={16} style={{ color: TK.brand }} />
            {processing ? "Processing..." : "Browse"}
          </SecondaryButton>
          <input ref={ref} type="file" className="hidden" multiple accept=".pdf,.docx,.md" onChange={handleBrowse} />
        </div>
        {processing ? (
          <div className="mt-2 inline-flex items-center gap-2 text-[12px]" style={{ color: TK.textMuted }}>
            <RefreshCcw className="h-4 w-4 animate-spin" />
            Parsing attachments...
          </div>
        ) : null}
        {error ? (
          <div className="mt-2 text-[12px]" style={{ color: TK.critical }}>
            {error}
          </div>
        ) : null}
      </div>

      {files.length > 0 && (
        <ul className="mt-2 space-y-2">
          {files.map((f) => (
            <li key={f.id} className="flex items-center justify-between rounded-md border p-2 text-sm" style={{ borderColor: TK.border }}>
              <div className="truncate">
                {f.name}{" "}
                <span className="text-[12px]" style={{ color: TK.textMuted }}>
                  - {nf.format(f.sizeKB)} KB
                </span>
              </div>
              <GhostButton onClick={() => onRemove(f.id)} aria-label={`Remove ${f.name}`}>
                <X size={16} />
                Remove
              </GhostButton>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
