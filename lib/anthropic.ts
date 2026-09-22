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

/** Thrown when Claude's structured-output response couldn't be parsed. */
export class GenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GenerationError";
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
  const response = await client.messages.parse(
    {
      model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5",
      max_tokens: 16000,
      system:
        "You are a career coach assistant that generates tailored job application materials. Be specific and grounded in the provided resume and job description — never invent credentials, employers, or experience the candidate doesn't have.",
      messages: [{ role: "user", content: buildPrompt(input) }],
      output_config: { format: zodOutputFormat(PrepKitSchema) },
    },
    // The SDK's default timeout is 10 minutes with auto-retry on timeout,
    // which can compound into a much longer hang than any interactive UI
    // (or Vercel's hard serverless duration cap) can tolerate. Fail fast
    // instead, comfortably under the route's 60s maxDuration.
    { timeout: 55_000, maxRetries: 0 },
  );

  if (!response.parsed_output) {
    throw new GenerationError("Model returned unparseable output");
  }

  return response.parsed_output;
}

export const JobSearchResultSchema = z.object({
  role: z.string().describe("The job title as posted."),
  company: z.string(),
  location: z
    .string()
    .describe("City/state as posted, or 'Remote' for remote roles."),
  sourceUrl: z
    .string()
    .describe(
      "Direct URL to the real job posting found via web search. Must be an actual URL from search results, never invented.",
    ),
  description: z
    .string()
    .describe(
      "The job description/requirements, as fully as can be extracted from the posting or search results.",
    ),
  whyGoodFit: z
    .string()
    .describe(
      "1-2 sentences on why this specific role aligns with the candidate's resume.",
    ),
});

export const JobSearchResultsSchema = z.object({
  results: z
    .array(JobSearchResultSchema)
    .max(5)
    .describe(
      "Up to 5 real, currently open job postings found via web search, ranked by fit with the candidate's resume. Fewer than 5 if fewer good matches exist — never pad with invented or poorly-matched postings.",
    ),
});

export type JobSearchResults = z.infer<typeof JobSearchResultsSchema>;

function buildSearchPrompt(input: {
  company?: string;
  location?: string;
  remote?: boolean;
  role?: string;
  resumeText: string;
}) {
  const criteria = [
    input.company && `Company: ${input.company}`,
    input.location && `Location: ${input.location}`,
    input.remote && "Remote roles are acceptable (in addition to, or instead of, the location above)",
    input.role && `Role/title: ${input.role}`,
  ]
    .filter(Boolean)
    .join("\n");

  return `Use web search to find up to 5 real, currently open job postings matching this search:

${criteria}

## Candidate's resume (rank/tailor results toward strongest fit with this background)
"""
${input.resumeText}
"""

For each result you find, return: the role title, company, location (or "Remote"), a direct URL to the actual posting, as much of the real job description/requirements as you can extract, and a short note on why it fits this candidate. Only include real postings you actually found via search — never invent a listing, company, or URL. If fewer than 5 good matches exist, return fewer rather than padding with weak or fabricated results.`;
}

export async function searchJobs(input: {
  company?: string;
  location?: string;
  remote?: boolean;
  role?: string;
  resumeText: string;
}): Promise<JobSearchResults> {
  const response = await client.messages.parse(
    {
      model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5",
      max_tokens: 16000,
      system:
        "You are a job search assistant. You use web search to find real, currently open job postings — you never invent listings, companies, or URLs. You rank results by genuine fit with the candidate's actual resume.",
      messages: [{ role: "user", content: buildSearchPrompt(input) }],
      tools: [{ type: "web_search_20260318", name: "web_search", max_uses: 4 }],
      output_config: { format: zodOutputFormat(JobSearchResultsSchema) },
    },
    // Multi-round web search is genuinely slow — measured 90s-250s+ for a
    // real search in testing, not the ~30s a plain generation call takes.
    // A short timeout here would fail most real searches, not just runaway
    // ones, so this budget is deliberately generous (see maxDuration on the
    // route, which must be raised to match on any host that enforces it).
    { timeout: 170_000, maxRetries: 0 },
  );

  if (!response.parsed_output) {
    throw new GenerationError("Model returned unparseable output");
  }

  return response.parsed_output;
}
