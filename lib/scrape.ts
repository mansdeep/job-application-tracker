import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";

const MIN_DESCRIPTION_LENGTH = 200;
const FETCH_TIMEOUT_MS = 10_000;
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export type ScrapeResult =
  | {
      success: true;
      company?: string;
      role?: string;
      description: string;
    }
  | { success: false; reason: string };

/** Rejects scrape targets that aren't public http(s) URLs (basic SSRF hardening). */
export function isSafeScrapeUrl(url: URL): boolean {
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost")) return false;
  if (host === "0.0.0.0" || host === "::1" || host === "[::1]") return false;
  // RFC1918 / loopback / link-local ranges
  if (
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    /^169\.254\./.test(host)
  ) {
    return false;
  }
  return true;
}

function metaContent(document: Document, selector: string): string | undefined {
  const el = document.querySelector(selector);
  const content = el?.getAttribute("content")?.trim();
  return content || undefined;
}

/**
 * Best-effort split of a page/og title into { role, company }. Job board
 * titles vary a lot; this handles the common "Role at Company" / "Role - Company"
 * / "Role | Company" patterns and falls back to leaving fields unset rather
 * than guessing wrong.
 */
function guessRoleAndCompany(
  title: string | undefined,
  siteName: string | undefined,
): { role?: string; company?: string } {
  if (!title) return {};

  const separators = [" at ", " - ", " – ", " — ", " | "];
  for (const sep of separators) {
    const idx = title.indexOf(sep);
    if (idx > 0) {
      const role = title.slice(0, idx).trim();
      let company = title.slice(idx + sep.length).trim();
      // Titles often end in "... | Careers" or "... | Job Board" after the
      // company — strip a trailing site-name segment if we recognize it.
      if (siteName && company.toLowerCase().includes(siteName.toLowerCase())) {
        company = siteName;
      }
      if (role.length > 0 && role.length < 120 && company.length > 0 && company.length < 120) {
        return { role, company };
      }
    }
  }
  return {};
}

export async function scrapeJobUrl(url: URL): Promise<ScrapeResult> {
  let html: string;
  try {
    const res = await fetch(url.toString(), {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      redirect: "follow",
    });
    if (!res.ok) {
      return { success: false, reason: `Site returned ${res.status}` };
    }
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) {
      return { success: false, reason: "URL did not return an HTML page" };
    }
    html = await res.text();
  } catch (err) {
    return {
      success: false,
      reason: err instanceof Error ? err.message : "Fetch failed",
    };
  }

  let dom: JSDOM;
  try {
    dom = new JSDOM(html, { url: url.toString() });
  } catch {
    return { success: false, reason: "Could not parse page HTML" };
  }

  const { document } = dom.window;
  const ogTitle = metaContent(document, 'meta[property="og:title"]');
  const ogSiteName = metaContent(document, 'meta[property="og:site_name"]');
  const pageTitle = ogTitle ?? document.title ?? undefined;

  let description = "";
  try {
    const article = new Readability(dom.window.document).parse();
    description = article?.textContent?.trim() ?? "";
  } catch {
    // fall through with empty description
  }

  if (description.length < MIN_DESCRIPTION_LENGTH) {
    return {
      success: false,
      reason:
        "Couldn't extract enough text from this page — it may require JavaScript to load the description",
    };
  }

  const { role, company } = guessRoleAndCompany(pageTitle, ogSiteName);

  return { success: true, company, role, description };
}
