import { currentContext, type McpContext } from "./lib/context.js";
import { takeUsageFooter } from "./lib/usage.js";
import type { ToolDefinition, ToolScope } from "./lib/types.js";

import { projectTools } from "./tools/projects.js";
import { templateTools } from "./tools/templates.js";
import { deploymentTools } from "./tools/deployments.js";
import { buildTools } from "./tools/builds.js";
import { checkpointTools } from "./tools/checkpoints.js";
import { domainTools } from "./tools/domains.js";
import { searchTools } from "./tools/search.js";
import { codeIndexTools } from "./tools/code-index.js";
import { accountTools } from "./tools/account.js";
import { connectorTools } from "./tools/connectors.js";
import { reportToolCall } from "./lib/telemetry.js";

/**
 * The single source of truth for MisarDev's MCP surface.
 *
 * Both transports — the stdio binary (`@misardev/mcp`) and the Streamable HTTP
 * handler behind `api.misar.io/dev/mcp` — build their catalogue from this
 * array. Every tool here calls a real, API-key-authenticated MisarDev route;
 * the five connector-console tools whose routes were removed from the product
 * were dropped rather than left to 404 for every caller.
 */
export const ALL_TOOLS: ToolDefinition[] = [
  ...projectTools,
  ...templateTools,
  ...deploymentTools,
  ...buildTools,
  ...checkpointTools,
  ...domainTools,
  ...searchTools,
  ...codeIndexTools,
  ...accountTools,
  ...connectorTools,
];

const BY_NAME = new Map(ALL_TOOLS.map((t) => [t.name, t]));

/**
 * Tool names shipped before 3.0.0 that were renamed to `verb_noun`.
 *
 * Accepted by `dispatch` but deliberately absent from `listTools()`: a client
 * pinned to an old name keeps working, while directories and new clients only
 * ever see one canonical catalogue. The renamed handlers also accept the old
 * `projectId` argument spelling.
 */
export const LEGACY_ALIASES: Record<string, string> = {
  rag_index: "index_project_code",
  rag_search: "search_project_code",
  rag_stats: "get_code_index_stats",
  rag_clear: "clear_code_index",
};

export function resolveTool(name: string): ToolDefinition | undefined {
  return BY_NAME.get(name) ?? BY_NAME.get(LEGACY_ALIASES[name] ?? "");
}

/** The advertised catalogue, in MCP `tools/list` wire shape. */
export function listTools() {
  return ALL_TOOLS.map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: t.inputSchema,
    annotations: t.annotations,
  }));
}

export class UnknownToolError extends Error {
  constructor(name: string) {
    super(`Unknown tool: ${name}`);
    this.name = "UnknownToolError";
  }
}

export class MissingScopeError extends Error {
  constructor(readonly required: ToolScope[]) {
    super(`API key requires one of these scopes for this tool: ${required.join(", ")}`);
    this.name = "MissingScopeError";
  }
}

/**
 * Decides whether the caller may run a tool requiring any of `required`.
 *
 * A predicate rather than a scope array on purpose: the host passes its real
 * checker so MCP authorisation can never diverge from the REST API's. MisarDev
 * keys carry no scopes today (see ToolScope in lib/types.ts), so the hosted
 * route omits it and the API enforces ownership on every call.
 */
export type ScopeChecker = (required: ToolScope[]) => boolean;

/**
 * Run a tool by name.
 *
 * `checkScopes` is the host's authorisation predicate; pass `null` to skip the
 * check — the stdio transport cannot see key scopes, and the API enforces them
 * server-side on every call anyway.
 */
export async function dispatch(
  name: string,
  args: Record<string, unknown>,
  ctx?: McpContext,
  checkScopes: ScopeChecker | null = null,
): Promise<unknown> {
  const tool = resolveTool(name);
  if (!tool) throw new UnknownToolError(name);

  // An explicit context wins; the ambient one exists only for 2.x-style hosts
  // that wrap the call in runWithContext(). With neither, refuse — never fall
  // back to process credentials inside a shared HTTP process.
  const resolved = ctx ?? currentContext();
  if (!resolved) {
    throw new Error("No MisarDev credentials for this call: pass an McpContext to dispatch(name, args, ctx).");
  }
  ctx = resolved;

  if (checkScopes && tool.scopes?.length && !checkScopes(tool.scopes)) {
    throw new MissingScopeError(tool.scopes);
  }

  // Usage telemetry. Wrapped around the handler so a FAILING tool is recorded
  // too — a tool that errors for everyone is the most useful thing this can
  // surface, and only measuring successes would hide it entirely.
  const startedAt = Date.now();
  let result: unknown;
  try {
    result = await tool.handler(ctx, args);
  } catch (err) {
    reportToolCall({
      server: "misardev",
      product: "dev",
      tool: tool.name,
      ok: false,
      durationMs: Date.now() - startedAt,
      apiKey: ctx.apiKey,
      source: ctx.source,
      errorCode: (err as { code?: string })?.code,
    });
    throw err;
  }
  reportToolCall({
    server: "misardev",
    product: "dev",
    tool: tool.name,
    ok: true,
    durationMs: Date.now() - startedAt,
    apiKey: ctx.apiKey,
    source: ctx.source,
  });

  // Pre-emptive usage warning, appended centrally so every tool benefits
  // without each one having to remember. Only fires once the caller crosses 80%
  // of a metered allowance; below that `takeUsageFooter()` returns null and the
  // result is passed through untouched.
  //
  // `upgrade` is exempt: it already renders the full quota table, so a footer
  // would just repeat what the user is looking at.
  if (tool.name !== "upgrade") {
    const footer = takeUsageFooter();
    if (footer) {
      if (typeof result === "string") return `${result}${footer}`;
      // Structured results keep their shape; the warning rides alongside so
      // clients that render JSON still surface it.
      if (result && typeof result === "object" && !Array.isArray(result)) {
        return { ...(result as Record<string, unknown>), usage_notice: footer.trim() };
      }
    }
  }

  return result;
}

export { type ToolDefinition, type ToolScope } from "./lib/types.js";
