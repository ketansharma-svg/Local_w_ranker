import type { WriterAttachment } from "../ai/writer-schema";

const SUPPORTED_EXT = /\.(pdf|docx|md)$/i;
export const ATTACHMENT_MAX_BYTES = 1 * 1024 * 1024;
const MAX_ATTACHMENT_CHARS = 8000;
const PDF_PAGE_LIMIT = 8;

const normalizeWhitespace = (input: string) => input.replace(/\s+/g, " ").replace(/\u0000/g, "").trim();

const guessMimeFromName = (name: string) => {
  if (/\.pdf$/i.test(name)) return "application/pdf";
  if (/\.docx$/i.test(name)) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (/\.md$/i.test(name)) return "text/markdown";
  return "application/octet-stream";
};

const decodeXmlEntities = (value: string) =>
  value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

const ensurePdfModule = (() => {
  let pdfPromise: Promise<any> | null = null;
  return () => {
    if (!pdfPromise) {
      pdfPromise = import("pdfjs-dist");
    }
    return pdfPromise;
  };
})();

const extractMarkdownText = async (file: File) => file.text();

const extractDocxText = async (file: File) => {
  const { default: JSZip } = await import("jszip");
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const xml = await zip.file("word/document.xml")?.async("string");
  if (!xml || typeof DOMParser === "undefined") return "";
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, "application/xml");
  const nodes = Array.from(doc.getElementsByTagNameNS("*", "t"));
  if (!nodes.length) return "";
  return nodes
    .map((node) => decodeXmlEntities(node.textContent ?? ""))
    .join(" ");
};

const extractPdfText = async (file: File) => {
  const pdfjs = await ensurePdfModule();
  if (pdfjs.GlobalWorkerOptions && !pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  }
  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  let collected = "";
  const maxPages = Math.min(doc.numPages, PDF_PAGE_LIMIT);
  for (let pageNum = 1; pageNum <= maxPages && collected.length < MAX_ATTACHMENT_CHARS; pageNum++) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();
    collected +=
      content.items
        .map((item: any) => (item && typeof item.str === "string" ? item.str : ""))
        .join(" ") + "\n\n";
  }
  await doc.cleanup();
  doc.destroy?.();
  return collected;
};

const extractTextFromFile = async (file: File) => {
  if (/\.pdf$/i.test(file.name)) return extractPdfText(file);
  if (/\.docx$/i.test(file.name)) return extractDocxText(file);
  return extractMarkdownText(file);
};

export const isSupportedAttachment = (file: File) => SUPPORTED_EXT.test(file.name) && file.size <= ATTACHMENT_MAX_BYTES;

export const readAttachmentFile = async (file: File): Promise<WriterAttachment> => {
  const raw = await extractTextFromFile(file);
  const cleaned = normalizeWhitespace(raw).slice(0, MAX_ATTACHMENT_CHARS);
  return {
    id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: file.name,
    sizeKB: Math.max(1, Math.round(file.size / 1024)),
    mime: file.type || guessMimeFromName(file.name),
    text: cleaned || undefined,
  };
};
