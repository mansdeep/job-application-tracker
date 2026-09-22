import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

const client = new Anthropic();

// Prep Kit generation is plain text generation (no tools, no web search), so
// it doesn't need Sonnet's extra reasoning — Haiku is markedly faster here
// and keeps generation comfortably inside the timeout below. Job search
// (further down) stays on the stronger ANTHROPIC_MODEL default since it has
// to plan and interpret multi-round web search.
const PREPKIT_MODEL = process.env.ANTHROPIC_PREPKIT_MODEL ?? "claude-haiku-4-5-20251001";

// Hard cap on Prep Kit generation — in practice Haiku finishes in well under
// a minute, but this is the outer bound the user should never wait past.
export const PREPKIT_DEADLINE_MS = 180_000; // 3 minutes

export const PrepKitSchema = z.object({
  coverLetter: z
    .string()
    .describe(
      "A tailored cover letter for this job, formatted as an actual letter ready to send (opening greeting, body, sign-off). The body is 3 to 4 paragraphs covering, in order: (1) interest in this specific position and why, (2) a summary of the candidate's capability, (3) what the candidate can bring to the team — plus an optional short 4th closing paragraph. Each paragraph is 3-5 sentences, and the sentence count should vary from paragraph to paragraph (don't make them all the same length). Do not start with a label like 'Cover Letter' — begin directly with the letter itself.",
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
      "A company brief in exactly 3 paragraphs: (1) what the company does, (2) where this specific role/position fits within the company, (3) major recent news about the company (or, if nothing notable is known, a brief honest note that no significant recent news is known — never invent news). Each paragraph is 3-5 sentences.",
    ),
  resumeGaps: z
    .array(z.string().max(120))
    .describe(
      "One short, plain-language bullet (under 20 words, no jargon-heavy phrasing) per notable gap between what this job description asks for and what's actually on the candidate's base resume. List every real gap found as its own bullet — do not compress multiple gaps into one bullet, and do not discard findings. Empty array if there's genuinely no notable gap.",
    ),
  resumeAdditions: z
    .array(z.string().max(120))
    .describe(
      "One short, plain-language bullet (under 20 words, no jargon-heavy phrasing) per skill, tool, or experience that was emphasized or added in the rewritten resume above to help close the gaps listed in resumeGaps. List every meaningful addition as its own bullet — do not compress multiple additions into one bullet, and do not discard findings. Empty array if nothing was added.",
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
  notes?: string;
}) {
  const notesSection = input.notes
    ? `\n## Candidate's own notes on this job/application (take these into account — they may contain context, preferences, or details not in the resume or job description)\n"""\n${input.notes}\n"""\n`
    : "";

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
${notesSection}
Produce all of the following, tailored specifically to this job and this candidate's actual background (do not invent experience they don't have):
1. A tailored cover letter — formatted as a real, ready-to-send letter. No "Cover Letter" label at the top; start with the letter itself. Body is 3-4 paragraphs: (1) interest in this position and why, (2) capability summary, (3) what the candidate can bring to the team, optionally (4) a short closing. Each paragraph 3-5 sentences, with the sentence count varied across paragraphs rather than uniform.
2. Their resume rewritten in plain text to emphasize the experience most relevant to this job — formatted like a real resume (name first, then contact info, then ALL-CAPS section headings such as SUMMARY / EXPERIENCE / EDUCATION / SKILLS). No "Rewritten Resume" or "Resume" label at the top; start with the candidate's name.
3. 10 likely interview questions for this specific role.
4. A company brief in exactly 3 paragraphs: (1) what the company does, (2) where this role fits within the company, (3) major recent news about the company. Each paragraph 3-5 sentences.
5. A list of every notable gap between what this job description asks for and what's on the candidate's base resume, each as its own short, plain-language bullet under 20 words — don't compress multiple gaps into one, and don't drop any.
6. A list of every skill, tool, or experience emphasized or added in the rewritten resume to help close those gaps, each as its own short, plain-language bullet under 20 words — don't compress multiple additions into one, and don't drop any.`;
}

export async function generatePrepKit(input: {
  company: string;
  role: string;
  jobDescription: string;
  resumeText: string;
  notes?: string;
}): Promise<PrepKitContent> {
  const response = await client.messages.parse(
    {
      model: PREPKIT_MODEL,
      max_tokens: 16000,
      system:
        "You are a career coach assistant that generates tailored job application materials. Be specific and grounded in the provided resume and job description — never invent credentials, employers, or experience the candidate doesn't have.",
      messages: [{ role: "user", content: buildPrompt(input) }],
      output_config: { format: zodOutputFormat(PrepKitSchema) },
    },
    // The SDK's default timeout is 10 minutes with auto-retry on timeout,
    // which can compound into a much longer hang than any interactive UI
    // can tolerate. Cap it at PREPKIT_DEADLINE_MS instead — the route's
    // maxDuration is kept comfortably above this.
    { timeout: PREPKIT_DEADLINE_MS, maxRetries: 0 },
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
    .max(3)
    .describe(
      "Up to 3 real, currently open job postings found via web search, ranked by fit with the candidate's resume. Fewer than 3 if fewer good matches exist — never pad with invented or poorly-matched postings.",
    ),
});

export type JobSearchResults = z.infer<typeof JobSearchResultsSchema>;

// Multi-round web search latency varies with how many searches it takes to
// land 3 good matches — live-tested at 15-45s per full run (with the fixes
// below). Rather than fail outright past a deadline, the search phase below
// is capped hard at this budget and whatever it found by then is kept and
// used — "give me what you have" rather than all-or-nothing.
const SEARCH_DEADLINE_MS = 180_000; // 3 minutes

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

  return `Use web search to find up to 3 real, currently open job postings matching this search:

${criteria}

## Candidate's resume (rank/tailor results toward strongest fit with this background)
"""
${input.resumeText}
"""

As soon as you're confident about a good match, write it up in your response immediately — don't wait until you've searched for all 3 before writing the first one up. This work may be cut short before you finish searching, so getting your best finding written down early matters more than being exhaustive.

IMPORTANT — verify before including: search results are often stale. Job postings get filled or taken down but stay indexed by search engines for weeks. Before writing up a match, use the web_fetch tool to open its actual posting URL and confirm the page still shows an active, open posting (not "this position has been filled", "no longer accepting applications", a 404, a generic "job not found" page, or a redirect to a generic careers search page). If the fetched page shows the posting is no longer available, discard it and keep searching for a different real match instead. Never write up a posting you have not verified this way.

For each verified match, write: the role title, company, location (or "Remote"), the direct posting URL, the job description/requirements as extracted, and a short note on why it fits this candidate. Only write up real, currently-open postings you actually found and verified — never invent a listing, company, or URL.`;
}

/**
 * Phase 1: stream a web-search-driven research pass, hard-capped at
 * SEARCH_DEADLINE_MS. No structured-output constraint here — this is
 * deliberately free-form prose so that whatever text has been written by
 * the deadline (even if the model was cut off mid-search) is still usable
 * research notes, not truncated/invalid JSON. Returns "" if nothing was
 * written before the deadline or the stream errored with nothing captured.
 */
async function gatherJobFindings(input: {
  company?: string;
  location?: string;
  remote?: boolean;
  role?: string;
  resumeText: string;
}): Promise<string> {
  const stream = client.messages.stream(
    {
      model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5",
      max_tokens: 8000,
      system:
        "You are a job search research assistant. You use web search to find real, currently open job postings and web_fetch to verify each one is still active before reporting it — you never invent listings, companies, or URLs, and you never report a posting you haven't verified is still open. You write up each verified match as soon as you have it, rather than batching everything until the very end.",
      messages: [{ role: "user", content: buildSearchPrompt(input) }],
      // Deliberately pinned to these dated tool versions, not the newest
      // ones. The newer "web_search_20260318" tool makes the model wrap
      // every search inside a code_execution sandbox (calling web_search()
      // as a Python function) — live-tested at 2-3x the latency and, worse,
      // it often burns the entire time budget on tool calls without ever
      // emitting any text, so a timeout produced zero findings. These dated
      // versions get direct tool calls with no such wrapping. web_fetch is
      // included specifically so the model can open each posting's URL and
      // confirm it's still active — live-tested this catches real cases of
      // stale/filled postings that search results alone don't reveal (the
      // page stays indexed by search engines long after a posting closes).
      tools: [
        { type: "web_search_20250305", name: "web_search", max_uses: 8 },
        { type: "web_fetch_20250910", name: "web_fetch", max_uses: 10 },
      ],
    },
    { timeout: SEARCH_DEADLINE_MS + 15_000, maxRetries: 0 },
  );

  let findings = "";
  stream.on("text", (delta) => {
    // Accumulate raw deltas, not the SDK's `snapshot` argument — snapshot
    // only reflects the *current* text content block and resets to empty
    // when a new text block starts after an interleaved tool_use block.
    // The model writes each job match as its own text block separated by
    // web_search tool calls, so using snapshot here silently discarded
    // every write-up but the last one — this was a real bug, the likely
    // reason searches kept coming back near-empty even when the model had
    // genuinely found and written up good matches.
    findings += delta;
  });

  const timer = setTimeout(() => stream.abort(), SEARCH_DEADLINE_MS);
  try {
    await stream.finalMessage();
  } catch (err) {
    // A genuine API error (auth, billing, rate limit, connection) is not
    // "ran out of time" — surface it normally. Only our own deadline-abort
    // falls through to use whatever findings were captured above.
    if (!stream.aborted) throw err;
  } finally {
    clearTimeout(timer);
  }

  return findings.trim();
}

/**
 * Phase 2: fast, non-search structured extraction from phase 1's raw
 * findings. No web search tool here, so this reliably completes quickly
 * regardless of how phase 1 ended — it just needs to parse whatever prose
 * it was handed into clean job entries, dropping anything incomplete.
 */
async function extractJobResults(findings: string): Promise<JobSearchResults> {
  const response = await client.messages.parse(
    {
      model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5",
      max_tokens: 4000,
      system:
        "You extract structured job listings from research notes. Only include complete entries that have a real posting URL in the notes — skip anything incomplete, cut off, or missing a URL. Never invent or complete a detail that isn't in the notes.",
      messages: [
        {
          role: "user",
          content: `Extract up to 3 complete job postings from these research notes:\n\n"""\n${findings}\n"""`,
        },
      ],
      output_config: { format: zodOutputFormat(JobSearchResultsSchema) },
    },
    { timeout: 30_000, maxRetries: 0 },
  );

  if (!response.parsed_output) {
    throw new GenerationError("Model returned unparseable output");
  }

  return response.parsed_output;
}

export async function searchJobs(input: {
  company?: string;
  location?: string;
  remote?: boolean;
  role?: string;
  resumeText: string;
}): Promise<JobSearchResults> {
  const findings = await gatherJobFindings(input);
  if (!findings) {
    return { results: [] };
  }
  return extractJobResults(findings);
}
