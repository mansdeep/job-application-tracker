import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { UnauthorizedError, UnapprovedError } from "@/lib/auth";
import { GenerationError } from "@/lib/anthropic";

/** Maps a caught error to a JSON error response with the right status code. */
export function toErrorResponse(error: unknown) {
  if (error instanceof UnauthorizedError) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (error instanceof UnapprovedError) {
    return NextResponse.json(
      { error: "Your account is pending approval." },
      { status: 403 },
    );
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: "Invalid request", issues: error.issues },
      { status: 400 },
    );
  }
  console.error(error);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

/**
 * Maps an error from an Anthropic API call to a JSON error response with a
 * clear, actionable message. `logTag` scopes console output to the calling
 * route (e.g. "[prepkit]", "[job-search]"). Returns null if the error isn't
 * a recognized Anthropic error, so the caller can fall through to its own
 * handling (or rethrow).
 */
export function toAnthropicErrorResponse(err: unknown, logTag: string) {
  if (err instanceof Anthropic.RateLimitError) {
    return NextResponse.json(
      { error: "We're handling a lot of requests right now — please try again shortly." },
      { status: 503 },
    );
  }
  if (err instanceof Anthropic.BadRequestError && /credit balance/i.test(err.message)) {
    console.error(`${logTag} Anthropic billing error`, err);
    return NextResponse.json(
      {
        error:
          "The Anthropic account behind this app is out of credits. Add credits in the Anthropic Console (Plans & Billing) and try again.",
      },
      { status: 500 },
    );
  }
  if (
    err instanceof Anthropic.AuthenticationError ||
    err instanceof Anthropic.PermissionDeniedError
  ) {
    console.error(`${logTag} Anthropic auth/config error`, err);
    return NextResponse.json(
      { error: "This feature isn't configured correctly. Please try again later." },
      { status: 500 },
    );
  }
  if (err instanceof Anthropic.APIConnectionTimeoutError) {
    console.error(`${logTag} timed out`, err);
    return NextResponse.json(
      { error: "This is taking too long. Please try again — a narrower search is often faster." },
      { status: 504 },
    );
  }
  if (err instanceof Anthropic.APIError || err instanceof GenerationError) {
    console.error(`${logTag} generation failed`, err);
    return NextResponse.json({ error: "Generation failed. Please try again." }, { status: 502 });
  }
  return null;
}
