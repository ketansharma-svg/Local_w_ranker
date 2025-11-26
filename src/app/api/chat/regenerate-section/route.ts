import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";
import type { DraftSection, ProjectInfo, WriterInputs } from "@/src/lib/ai/writer-schema";
const MODEL = process.env.WRITER_MODEL!;


const SECTION_SYSTEM_PROMPT = `
You generate or rewrite one section inside a longer article.

Write as a human editor would: keep the section aligned with the topic, audience, locale, and tone from the brief, but improve flow and specificity.

STYLE:
- Start with the correct markdown heading line (## or ###) followed by the heading text.
- Follow with 2–4 paragraphs (and bullets if useful) that mix short, medium, and long sentences.
- Avoid generic filler like "This section will cover" or "In this section".
- Keep wording distinct from any existing draft text you are given: rephrase ideas instead of copying sentences.
- Use concrete, specific details and examples that fit the topic and locale.
- Stay consistent with the tone (Neutral, Helpful, Confident, Playful) and reading level from the brief.

Return JSON only, matching the provided schema:
- heading: the final heading text.
- markdown: the full section content, starting with the markdown heading line.
- summary: optional 1–2 sentence summary of what this section delivers.
`;



const sectionSchema = z.object({
    heading: z.string(),
    markdown: z.string(),
    summary: z.string().optional(),
});

type SectionBody = {
    inputs: WriterInputs;
    project?: ProjectInfo | null;
    section: (DraftSection & { level?: "h2" | "h3"; notes?: string; reason?: string });
};

const buildSectionPrompt = (inputs: WriterInputs, project: ProjectInfo | null | undefined, section: SectionBody["section"]) => {
    const levelPrefix = section.level === "h3" ? "###" : "##";
    const audience = inputs.audience ? `Audience: ${inputs.audience}.` : "";
    const keywords = inputs.keywords?.length ? `Keywords: ${inputs.keywords.join(", ")}.` : "";
    const competitors = inputs.competitors?.length ? `Competitors/refs: ${inputs.competitors.join(", ")}.` : "";
    const notes = section.notes ? `User notes: ${section.notes}.` : "User notes: none provided.";
    const attachments = inputs.attachments?.length ? `Attachments available: ${inputs.attachments.map((f) => f.name).join(", ")}.` : "";
    const reason = section.reason ? `Regeneration intent: ${section.reason}.` : "Regeneration intent: general improvement.";
    const existing = section.markdown
        ? `Existing draft to refine:
${section.markdown}`
        : "No existing draft was provided; write a fresh section.";

    return `Project: ${project ? `${project.name} (${project.domain})` : "General"}
Content type: ${inputs.contentType || "n/a"}
Locale: ${inputs.locale || "n/a"}
Word count target: ${inputs.wordCount || "use best judgement"}
Tone: ${inputs.tone || "Helpful"}
${audience}
${keywords}
${competitors}
${attachments}
${reason}
${notes}

Topic: ${inputs.topic}
Target heading: ${section.heading}
Heading level: ${levelPrefix}

${existing}

Write ONLY this section. Begin with "${levelPrefix} ${section.heading}" and provide 2-4 paragraphs (and bullets if helpful) that stay on-topic and readable.
Vary sentence length and structure so the prose feels naturally written, not repetitive.
Avoid repeating exact sentences from the existing draft; keep ideas but express them in a fresher way.`};

export async function POST(req: Request) {
    try {
        const body = (await req.json()) as SectionBody;
        if (!body?.inputs || !body.section?.heading) {
            return new Response("Missing inputs or section heading", { status: 400 });
        }

        const result = await generateObject({
      model: openai(MODEL),
            schema: sectionSchema,
            system: SECTION_SYSTEM_PROMPT,
            prompt: buildSectionPrompt(body.inputs, body.project ?? null, body.section),
        });

        return Response.json(result.object);
    } catch (error) {
        console.error("Error regenerating section", error);
        return new Response("Failed to regenerate section", { status: 500 });
    }
}
