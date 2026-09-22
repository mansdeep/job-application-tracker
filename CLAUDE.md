# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start the dev server (Turbopack) at http://localhost:3000
- `npm run build` — production build (also type-checks; run this before committing)
- `npm run lint` — ESLint
- `npx tsc --noEmit` — type-check only, faster than a full build
- No test suite exists in this repo.

### Local database

This project uses a **local Prisma dev Postgres server**, not Docker or a system Postgres install:

```
npx prisma dev -d -n jobtracker   # start (detached), first time only
npx prisma dev ls                 # list running servers + connection URL
```

`.env`'s `DATABASE_URL`/`DIRECT_URL` point at this local server. After a schema change:

```
npx prisma migrate dev --name <name>   # create + apply a migration
npx prisma generate                     # regenerate the client (also runs automatically after migrate dev)
```

**Known quirk**: `prisma migrate dev` in this environment can fail with a P3006/P3018 shadow-database error ("type X already exists") that is *not* real schema drift — inspecting the shadow DB directly showed it clean. If this happens, apply the schema with `npx prisma db push`, hand-write the migration SQL to match, and record it with `npx prisma migrate resolve --applied <name>` so migration history stays correct for production deploys. See `prisma/migrations/20260922010000_add_theme_preference/` and `prisma/migrations/20260922131905_add_prepkit_resume_analysis/` for real examples of this recovery.

**After any schema change, restart `next dev`.** `lib/prisma.ts` caches the `PrismaClient` instance on `globalThis` (the standard pattern to survive Fast Refresh without leaking connections) — but that means the *first* instance constructed in a dev server's process lifetime keeps being reused even after `prisma generate` regenerates the client with new fields, because the global cache check (`globalForPrisma.prisma ?? new PrismaClient(...)`) skips construction entirely if a cached instance already exists. A schema change made while the dev server is still running from before the migration will manifest as a 500 Internal Server Error on any route touching the new field(s) — the running server literally doesn't know they exist. Kill and restart `npm run dev` to pick it up; this was a real, live-reproduced cause of "Generate Preparation Kit throws Internal Server Error" after adding columns to `PrepKit`.

`prisma init` also auto-installs vendor "AI agent skill" reference docs into `.claude/skills/`, `.agents/skills/`, `.windsurf/skills/` on first run — these are gitignored on purpose; they're Prisma's own docs, not project content.

## Architecture

Next.js 16 App Router + TypeScript + Tailwind v4, Prisma 7 + Postgres, Auth.js v5 (magic-link email via Resend), Anthropic Claude for AI features. Single-tenant-per-row multi-user app: every query is scoped to the signed-in user.

### Auth: split config is load-bearing

`auth.config.ts` (edge-safe: no adapter, no Node-only providers) vs `auth.ts` (full config: Prisma adapter + Resend provider). `proxy.ts` (Next 16's renamed `middleware.ts`) imports **only** `auth.config.ts` — importing the full `auth.ts` there would pull the Prisma client (which needs the Node `pg` driver) into the Edge runtime and break the build. Session strategy is JWT, not database, specifically because Edge middleware can't hit the database to validate a database session. Every API route calls `requireSession()` from `lib/auth.ts`, which scopes all Prisma queries to `session.user.id` — this is the entire per-user data isolation mechanism, so it must not be skipped in a new route.

### New-user approval gate

New sign-ups aren't usable until an admin approves them: `User.isApproved` defaults to `false`, and `requireSession()` (in `lib/auth.ts`) throws `UnapprovedError` for a signed-in-but-unapproved user — so the approval gate applies everywhere `requireSession()` already does (every API route, plus `board`/`profile` pages), with no extra call site changes needed. Emails in `ADMIN_EMAILS` (comma-separated env var) always pass this check regardless of their DB `isApproved` value — see `lib/admin.ts#isAdminEmail`. That file deliberately has no dependency on `lib/auth.ts` or `auth.ts`: `auth.ts`'s `events.createUser` hook needs `isAdminEmail`/`adminEmails` too (to email admins when someone new signs up, via a second Resend client separate from the magic-link `ResendProvider`), and `auth.ts` importing from `lib/auth.ts` would be circular (`auth.ts` → `lib/auth.ts` → `auth.ts`, since `lib/auth.ts` imports `auth` from `auth.ts`).

`board/page.tsx` and `profile/page.tsx` are the two Server Component pages that call `requireSession()` directly (not through an API route's `catch { toErrorResponse(error) }`), so they each wrap it in a try/catch and `redirect("/pending")` on `UnapprovedError` — every other caller gets the 403 mapping in `lib/api-errors.ts` for free. `/admin` (`app/admin/page.tsx` + `app/api/admin/users/[id]/route.ts`, gated by `requireAdmin()`) lists pending/approved users with Approve/Revoke/Reject actions; Reject deletes the user outright (cascades to their jobs/kits) since there's no separate "rejected" state. `proxy.ts`'s matcher includes `/pending` and `/admin` alongside the original three prefixes, so both still require *some* session even though the finer-grained approved/admin checks happen server-side, not at the Edge.

### Prisma 7's driver-adapter model

This project was scaffolded against Prisma 7, which removed the `url`/`directUrl` fields from `datasource` in `schema.prisma` — connection strings now live in `prisma7.config.ts` (CLI/migrations) and are passed explicitly to a driver adapter in application code (`lib/prisma.ts` constructs `PrismaPg` from `pg` and passes it to `new PrismaClient({ adapter })`). The generator (`provider = "prisma-client"`) emits a TypeScript client to `app/generated/prisma/` (gitignored) rather than into `node_modules/@prisma/client`; import it as `@/app/generated/prisma/client`, not `@prisma/client`.

### AI integration (`lib/anthropic.ts`)

Two distinct patterns, both via `client.messages.parse()` with `output_config: { format: zodOutputFormat(Schema) }` for typed, validated JSON output instead of hand-parsing text:

- **Prep Kit generation** (`generatePrepKit`): a single plain generation call, no tools, on `ANTHROPIC_PREPKIT_MODEL` (defaults to Haiku, not the `ANTHROPIC_MODEL` Sonnet default used by job search below) — plain text generation doesn't need Sonnet's extra reasoning, and Haiku is markedly faster (live-tested at ~19s for a full kit). Hard-capped at `PREPKIT_DEADLINE_MS` (3 minutes) as an outer bound; in practice it finishes in well under a minute.
- **Job search** (`searchJobs`): web-search-driven. It's implemented as two phases: phase 1 (`gatherJobFindings`) streams a free-form research pass with the `web_search` tool, hard-aborted via `stream.abort()` at `SEARCH_DEADLINE_MS` (3 minutes) — whatever prose it wrote before the deadline is kept, not discarded, because free-form text degrades gracefully under truncation where constrained JSON does not. Phase 2 (`extractJobResults`) is a fast, tool-free structured-extraction pass over those notes, so the final JSON shape is always well-formed regardless of how phase 1 ended. Distinguish "ran out of time" (`stream.aborted === true`, fall through and use partial findings) from a genuine API error (rate limit / billing / auth — re-throw so the route's normal error mapping handles it) when catching `finalMessage()` rejections.

**Several real bugs found and fixed here, all worth guarding against regressing:**
1. The `web_search` tool is deliberately pinned to the dated `web_search_20250305` type, not a newer one. Live-tested: the newer `web_search_20260318` tool makes the current Sonnet model wrap every search inside a `code_execution` sandbox (it calls `web_search()` as a Python function instead of using the tool directly) — 2-3x slower, and worse, it can burn through the entire `SEARCH_DEADLINE_MS` budget issuing tool calls without ever emitting any text, producing zero findings even though nothing "failed." The dated tool version gets a direct tool call with no such wrapping.
2. Phase 1's text accumulation must concatenate raw deltas (`stream.on("text", (delta) => { findings += delta; })`), not use the SDK's `snapshot` argument — `snapshot` only reflects the *current* text content block and resets when a new text block starts after an interleaved `tool_use` block. Since the model writes each job match as its own text block separated by `web_search` calls, using `snapshot` silently discarded every write-up but the last one. This was the actual cause of "search finds nothing" even when the model had genuinely found and written up good matches.
3. Search results alone include stale postings — a job gets filled or taken down but stays indexed by search engines for weeks, and the model has no way to know that from search snippets. Fixed by also granting the `web_fetch` tool (dated `web_fetch_20250910`, for the same code-execution-wrapping reason as above) and instructing the model in `buildSearchPrompt` to actually open each candidate posting's URL and confirm it's still live before writing it up, discarding anything that shows as filled/closed/404/redirected. Live-tested against a real reported case (AT&T, Data Engineer, Atlanta GA) — the model's own research notes explicitly named and discarded a stale duplicate posting it had found, keeping only the verified-live one. `max_uses` is 8 for `web_search` and 10 for `web_fetch` since verification roughly doubles the tool-call budget needed per real finding.

Live-tested across several iterations with these fixes applied: Sonnet reliably finds 1-3/3 real, verified-live postings in 25-75s (verification adds real latency but stays well inside `SEARCH_DEADLINE_MS`); Haiku is faster but unreliable for this task — result count varied 0-3 across identical runs, including a full miss where it gave up and suggested generic job boards instead of using its remaining search budget. Sonnet stays the model for job search for that reason.

Both calls pass explicit `{ timeout, maxRetries: 0 }` — the SDK's default is a 10-minute timeout *with automatic retry on timeout*, which silently compounds into much longer hangs than any interactive request should tolerate; this was a real bug found and fixed during development, not a defensive default.

Anthropic API error mapping (rate limit, billing/no-credits, auth, connection-timeout, generic) is centralized in `lib/api-errors.ts#toAnthropicErrorResponse` and shared by every AI-backed route — extend it there rather than duplicating status-code logic per route. Corresponding `maxDuration` route exports must stay above the underlying call's real timeout budget, and are only honored on hosts that allow it: Vercel's Hobby/free tier hard-caps every function at 60s regardless of `maxDuration`, so the job-search feature needs at least a Vercel Pro plan (or another host without that cap) to run reliably once deployed.

### Data model invariant: PrepKit is one-to-one, by design

`PrepKit.jobApplicationId` is `@unique` in `prisma/schema.prisma`. This isn't incidental — it's what makes "you must delete the existing kit before regenerating" a database-enforced invariant rather than a UI convention: the generate route checks for an existing kit up front (409 if found), and the unique constraint is a race-condition safety net on top of that (caught via Prisma's `P2002` error code). A kit row is only ever written from a fully validated, parsed result, so "a kit exists" always means "a complete kit exists."

`generatePrepKit` also takes the job's `notes` (optional) and folds them into the prompt as context the model should account for — passed from the route as `job.notes ?? undefined`, so it's silently omitted when empty rather than injecting an empty section.

The model also returns `resumeGaps` and `resumeAdditions` (parallel arrays of short, itemized bullets under ~20 words each — every gap between the job description and the base resume, and every skill/tool the rewritten resume added to compensate; findings are never compressed or dropped down to a summary). These are columns on `PrepKit` itself (`Json`, like `interviewQuestions`), not appended to `JobApplication.notes` — deliberately, so deleting the kit deletes these findings too via the existing cascade, rather than leaving stale analysis text behind in the job's notes. `PATCH /api/jobs/[id]/prepkit` (`lib/validation.ts#updatePrepKitSchema`) lets the user hand-edit any of the six kit sections (cover letter, rewritten resume, interview questions, company brief, resume gaps, resume additions) after generation. Interview questions and the two bullet lists round-trip through the UI as newline-delimited text blocks (numbered-list / bullet-list formatted) and are re-split into `string[]` on save (`app/jobs/prepkit-panel.tsx#parseQuestions` / `#parseBullets`). The job description itself is also editable in place from the job detail view (`app/jobs/job-detail.tsx`), going through the ordinary `PATCH /api/jobs/[id]` route alongside notes/status — `JobApplication.notes` is purely user-owned free text now, untouched by Prep Kit generation.

Closing the job detail modal mid-generation is guarded: `PrepKitPanel` reports its `generating` state up via `onGeneratingChange`, and `JobDetail` uses that to confirm before honoring a close (backdrop click, the Close button, or an actual tab close/refresh via `beforeunload`) — generation isn't cancelled by closing, but the user could otherwise lose track of an in-flight request with no way back to it before the kit exists.

Cover letter and company brief have an enforced structure baked into the `PrepKitSchema` field descriptions (`lib/anthropic.ts`), not left to the model's own judgment: cover letter body is 3-4 paragraphs (interest in the role, capability summary, what the candidate brings, optional closing) with each paragraph 3-5 sentences and sentence counts deliberately varied; company brief is exactly 3 paragraphs (what the company does, where the role fits, recent company news) each 3-5 sentences.

### URL scraping (`lib/scrape.ts`)

Best-effort server-side fetch + `@mozilla/readability` extraction for the "add job from URL" flow. Known login-walled hosts (LinkedIn, Glassdoor, Indeed, ZipRecruiter) are denylisted up front rather than fetched — those sites return a sign-in challenge page to unauthenticated non-browser requests, and that page has enough real text to otherwise pass the "too little content" heuristic and get treated as if it were the actual job description. A secondary text-pattern check (`looksLikeAuthChallenge`) catches the same failure mode on hosts not in the denylist.

Parses the fetched HTML with `linkedom` (`parseHTML`), not `jsdom` — `jsdom` worked in local dev but crashed on every request in production with `Error [ERR_REQUIRE_ESM]: require() of ES Module .../@exodus/bytes/encoding-lite.js`, a real incompatibility between `jsdom`'s `html-encoding-sniffer` dependency (ESM-only) and how Vercel's Node runtime loads it (`require()`), not something fixable from this project's code. `linkedom` is built for exactly this server-side-DOM-for-Readability use case, has a much lighter dependency tree with no such ESM/CJS landmine, and is designed as a near-drop-in (`parseHTML(html)` returns `{ document, ... }` the same way `new JSDOM(html).window` did) — the only behavior change is it doesn't take a `url` option to set the document's base URL, which this feature doesn't need since it only reads text content, not resolving relative links.

### Resume text extraction (`lib/resume-extract.ts`)

PDF via `pdf-parse`, `.docx` via `mammoth`. `pdf-parse` is deliberately pinned to **v1** (`pdf-parse@1.1.1`, not the `^2.x` a fresh `npm install pdf-parse` would grab) — v2 rewrote it as a wrapper around the full `pdfjs-dist` rendering engine, which references browser-only globals (`DOMMatrix`) at module-load time. That worked fine in local dev but crashed on Vercel with `ReferenceError: DOMMatrix is not defined` the moment anyone tried to upload a resume in production — a real bug hit after deploying, not a theoretical one. v1 is the older, much simpler text-only parser with no `pdfjs-dist`/canvas dependency at all, which is all this feature actually needs. `pdf-parse` is still listed in `next.config.ts`'s `serverExternalPackages` to keep it a real unbundled `node_modules` import rather than something Turbopack inlines.

### Design system

Dark-first Linear-aesthetic tokens live in `app/globals.css` as CSS custom properties (`--color-canvas`, `--color-surface-1/2/3`, `--color-border`, `--color-text-primary/secondary/dim`, `--color-accent`, `--color-danger`), registered with Tailwind v4's `@theme inline` so components use them as ordinary utility classes (`bg-surface-2`, `text-text-primary`, `border-border`). **Light is the default theme**; dark is a per-user toggle (`User.themePreference` in the DB, Profile → Appearance), applied via `data-theme="dark"` set server-side in `app/layout.tsx` from the signed-in user's saved preference — there is no `prefers-color-scheme` branching. Full design rationale and the exact token-value mapping (including where it deliberately deviates from the source spec) is in `DESIGN.md`; consult it before changing colors, spacing, or component styling rather than guessing.

### Character limits (`lib/limits.ts`)

Every editable text box (job description, notes, and each Prep Kit section) shows a used/limit character counter (`components/ui/char-count.tsx`) and enforces the same number via the textarea's `maxLength` and the matching `lib/validation.ts` zod schema. `lib/limits.ts` is the single source of truth for these numbers specifically so the UI counter and the backend validation can't drift apart — add a new editable text field by adding its limit there first, then wire both ends to it, rather than picking a number independently in each place.

### Not real project docs

`AGENTS.md` is regenerated automatically by `next dev` on every run (see the file's own header comment) — it's boilerplate Next.js agent guidance, not project-specific instructions. `README.md` is unmodified `create-next-app` boilerplate.
