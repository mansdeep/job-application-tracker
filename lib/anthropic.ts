import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

const client = new Anthropic();

export const PrepKitSchema = z.object({
  coverLetter: z
    .string()
    .describe(
      "A tailored cover letter for this job, formatted as an actual letter ready to send (e.g. opening greeting, body, sign-off). Do not start with a label like 'Cover Letter' — begin directly with the letter itself.",
    ),
  rewrittenResume: z
    .string()
    .describe(
      "The candidate's resume rewritten in plain text to emphasize the experience most relevant to this job, formatted like a real resume: first line is the candidate's name, followed by contact info, then clear ALL-CAPS section headings (e.g. SUMMARY, EXPERIENCE, EDUCATION, SKILLS) with content below each. Do not start with a label like 'Rewritten Resume' or 'Resume' — begin directly with the candidate's name.",
    ),
  interviewQuestions: z
    .array(z.string())
    .length(10)
    .describe("10 likely interview questions for this specific role."),
  companyBrief: z
    .string()
    .describe(
      "A one-page brief about the company: what they do, recent news/context if inferable, and what they likely value in a candidate.",
    ),
});

export type PrepKitContent = z.infer<typeof PrepKitSchema>;

export class PrepKitGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PrepKitGenerationError";
  }
}

function buildPrompt(input: {
  company: string;
  role: string;
  jobDescription: string;
  resumeText: string;
}) {
  return `You are a career coach helping a candidate prepare a job application.

## Job
Company: ${input.company}
Role: ${input.role}

Job description:
"""
${input.jobDescription}
"""

## Candidate's base resume
"""
${input.resumeText}
"""

Produce all four of the following, tailored specifically to this job and this candidate's actual background (do not invent experience they don't have):
1. A tailored cover letter — formatted as a real, ready-to-send letter. No "Cover Letter" label at the top; start with the letter itself.
2. Their resume rewritten in plain text to emphasize the experience most relevant to this job — formatted like a real resume (name first, then contact info, then ALL-CAPS section headings such as SUMMARY / EXPERIENCE / EDUCATION / SKILLS). No "Rewritten Resume" or "Resume" label at the top; start with the candidate's name.
3. 10 likely interview questions for this specific role.
4. A one-page company brief covering what the company does and what they likely value in a candidate for this role.`;
}

export async function generatePrepKit(input: {
  company: string;
  role: string;
  jobDescription: string;
  resumeText: string;
}): Promise<PrepKitContent> {
  const response = await client.messages.parse({
    model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5",
    max_tokens: 16000,
    system:
      "You are a career coach assistant that generates tailored job application materials. Be specific and grounded in the provided resume and job description — never invent credentials, employers, or experience the candidate doesn't have.",
    messages: [{ role: "user", content: buildPrompt(input) }],
    output_config: { format: zodOutputFormat(PrepKitSchema) },
  });

  if (!response.parsed_output) {
    throw new PrepKitGenerationError("Model returned unparseable output");
  }

  return response.parsed_output;
}
