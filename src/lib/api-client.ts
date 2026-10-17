import type { McpContext } from "./context.js";
import { apiError } from "./errors.js";
import { noteUsage } from "./usage.js";

/** `?a=1&b=2`, dropping undefined/null/empty values. Empty string when nothing is set. */
export function buildQuery(params: Record<string, unknown>): string {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== "",
  );
  if (!entries.length) return "";
  return "?" + new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString();
}

/** Encode one path segment so an id can never smuggle `/`, `?` or `..` into the URL. */
export function seg(value: unknown): string {
  return encodeURIComponent(String(value ?? ""));
}

/**
 * Call a MisarDev API route under `<baseUrl>`.
 *
 * `https://api.misar.io/dev/projects` reaches the app's `/api/projects`: the
 * edge strips `/dev` and MisarDev's next.config rewrites the api.misar.io host
 * onto `/api/*`. `/v1/*` paths land on the public model API the same way.
 */
export async function apiFetch<T = unknown>(
  ctx: McpContext,
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${ctx.baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ctx.apiKey}`,
      "X-MCP-Source": ctx.source,
      ...options.headers,
    },
  });
  // Record remaining allowance before anything can throw, so the registry can
  // append the 80% warning to a successful result.
  noteUsage(res.headers);

  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw apiError(res.status, body);
  return body as T;
}

/** JSON body helper — keeps every write tool to one line. */
export function json(method: "POST" | "PATCH" | "PUT" | "DELETE", body?: unknown): RequestInit {
  return body === undefined ? { method } : { method, body: JSON.stringify(body) };
}
