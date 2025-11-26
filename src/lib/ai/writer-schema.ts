import { z } from "zod";

export const contentTypes = ["blog", "landing", "docs", "resource", "newsletter"] as const;
export const toneOptions = ["Neutral", "Helpful", "Confident", "Playful"] as const;
export const aeoIntents = ["direct_answer", "how_to", "comparative", "faq_first"] as const;

export type ContentType = (typeof contentTypes)[number];
export type ToneOption = (typeof toneOptions)[number];
export type AeoIntent = (typeof aeoIntents)[number];

export type ProjectInfo = {
  id: string;
  name: string;
  domain: string;
};

export type WriterAttachment = {
  id: string;
  name: string;
  sizeKB: number;
  mime: string;
  text?: string;
};

export type WriterInputs = {
  topic: string;
  keywords: string[];
  audience?: string;
  tone?: ToneOption;
  locale: string;
  contentType: ContentType | "";
  wordCount?: number;
  aeoIntent?: AeoIntent;
  competitors: string[];
  attachments: WriterAttachment[];
  policy: {
    citationsRequired: boolean;
    readingLevel?: string;
    brandTermsGuard: boolean;
  };
};

export type DraftSection = {
  id?: string;
  heading: string;
  markdown: string;
  score?: number;
  fk?: number;
  aeo?: string | any;
  topic?: any;
};

const faqSchema = z
  .union([
    z.object({
      question: z.string(),
      answer: z.string(),
    }),
    z.object({
      Q: z.string(),
      A: z.string(),
    }),
  ])
  .transform((entry) => ("question" in entry ? { question: entry.question, answer: entry.answer } : { question: entry.Q, answer: entry.A }));

const citationSchema = z
  .union([
    z.object({
      title: z.string(),
      domain: z.string(),
      url: z.string().url(),
    }),
    z.string(),
  ])
  .transform((entry) => {
    if (typeof entry === "string") {
      const cleaned = entry.replace(/^\[\d+\]\s*/, "");
      const parts = cleaned.split(" - ").map((p) => p.trim()).filter(Boolean);
      const maybeUrl = parts.pop();
      const maybeDomain = parts.pop();
      const title = parts.join(" - ") || maybeDomain || maybeUrl || "-";
      const url = maybeUrl && maybeUrl.startsWith("http") ? maybeUrl : "";
      const domain = maybeDomain && !maybeDomain.startsWith("http") ? maybeDomain : "";
      return { title, domain: domain || "-", url: url || "-" };
    }
    return entry;
  });

export const writerResponseSchema = z.object({
  outline: z
    .array(
      z.object({
        heading: z.string(),
        summary: z.string().optional(),
      })
    )
    .default([]),
  draft: z
    .array(
      z.object({
        id: z.string().optional(),
        heading: z.string(),
        markdown: z.string(),
        score: z.number().optional(),
        fk: z.number().optional(),
      })
    )
    .default([]),
  seoPack: z
    .object({
      titleTags: z.array(z.string()).default([]),
      metaDescriptions: z.array(z.string()).default([]),
    })
    .default({
      titleTags: [],
      metaDescriptions: [],
    }),
  geoPack: z
    .array(
      z.object({
        locale: z.string(),
        summary: z.string(),
        diff: z.string().optional(),
      })
    )
    .default([]),
  aeoPack: z
    .object({
      directAnswer: z.string().default(""),
      tldr: z.string().default(""),
      faqs: z.array(faqSchema).default([]),
    })
    .default({
      directAnswer: "",
      tldr: "",
      faqs: [],
    }),
  citations: z.array(citationSchema).default([]),
});

export type WriterResponse = z.infer<typeof writerResponseSchema>;

export const defaultInputs: WriterInputs = {
  topic: "",
  keywords: [],
  audience: "",
  tone: "Helpful",
  locale: "en-US",
  contentType: "",
  wordCount: 900,
  aeoIntent: "direct_answer",
  competitors: [],
  attachments: [],
  policy: {
    citationsRequired: true,
    readingLevel: "grade_9",
    brandTermsGuard: true,
  },
};
