/**
 * Execution context for a MisarDev MCP tool call.
 *
 * The same tool implementations run under two transports:
 *   - stdio  (npm `@misardev/mcp`) — credentials come from the environment or
 *            ~/.misardev/config.json, resolved at call time.
 *   - http   (`api.misar.io/dev/mcp`) — credentials arrive per request on the
 *            Authorization header and MUST NOT be cached in module state.
 *
 * Passing the context explicitly (rather than reading process.env inside
 * apiFetch) is what makes one tool registry safe to share between them: a
 * Next.js route serves many users from one process, so any module-level
 * credential would leak across requests.
 */
export interface McpContext {
  /** Raw MisarDev API key (`mdk_…`), without the `Bearer ` prefix. */
  apiKey: string;
  /** API base, e.g. `https://api.misar.io/dev` (the edge maps it onto `/api/*`). */
  baseUrl: string;
  /** Reported to the API as `X-MCP-Source` for per-transport analytics. */
  source: "mcp_stdio" | "mcp_http";
}

export const DEFAULT_BASE_URL = "https://api.misar.io/dev";

/** Build a context for an HTTP request that has already been authenticated. */
export function httpContext(apiKey: string, baseUrl?: string): McpContext {
  return {
    apiKey,
    baseUrl: (baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, ""),
    source: "mcp_http",
  };
}

import { AsyncLocalStorage } from "node:async_hooks";

/**
 * 2.x compatibility: hosts called
 * `runWithContext(httpContext(key, base), () => dispatch(name, args))`, and
 * MisarDev's thin routes (`apps/web/src/lib/mcp/server.ts`) still do. The
 * ambient context is consulted ONLY when `dispatch` is given no explicit
 * context; with neither, the call is refused rather than falling back to any
 * process-level credential.
 *
 * @deprecated pass the context to `dispatch(name, args, ctx)` instead.
 */
const ambient = new AsyncLocalStorage<McpContext>();

/** @deprecated pass the context to `dispatch(name, args, ctx)` instead. */
export function runWithContext<T>(ctx: McpContext, fn: () => Promise<T>): Promise<T> {
  return ambient.run(ctx, fn);
}

/** The context installed by `runWithContext`, if any. */
export function currentContext(): McpContext | null {
  return ambient.getStore() ?? null;
}
