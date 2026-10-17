import { extractUpgradeOffer, renderUpgradeOffer, type UpgradeOffer } from "./upgrade.js";

export function formatError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "An unknown error occurred";
}

/**
 * Error carrying a structured upgrade offer, so a caller that wants the raw
 * data (rather than the rendered card) can still reach it.
 */
export class PlanLimitError extends Error {
  readonly offer: UpgradeOffer;

  constructor(offer: UpgradeOffer, rendered: string) {
    super(rendered);
    this.name = "PlanLimitError";
    this.offer = offer;
  }
}

/**
 * Turn a non-2xx API response into an Error carrying the server's own message.
 *
 * When the body is a plan-limit rejection, the message becomes the full
 * rendered upgrade card — so EVERY tool surfaces the upsell automatically,
 * without each one needing to handle quota errors itself. This module used to
 * drop the offer entirely and `String()` the error field, which turns a nested
 * `{ error: { message } }` body into the literal text "[object Object]".
 */
export function apiError(status: number, body: unknown): Error {
  const offer = extractUpgradeOffer(body);
  if (offer) return new PlanLimitError(offer, renderUpgradeOffer(offer));

  if (typeof body === "object" && body !== null) {
    const b = body as Record<string, unknown>;
    if (typeof b.error === "string") return new Error(b.error);
    if (typeof b.message === "string") return new Error(b.message);
    // A nested { error: { message } } — never String() an object into the UI.
    if (typeof b.error === "object" && b.error !== null) {
      const inner = b.error as Record<string, unknown>;
      if (typeof inner.message === "string") return new Error(inner.message);
    }
  }
  return new Error(`HTTP ${status}`);
}
