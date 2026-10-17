import type { McpContext } from "./context.js";

/**
 * A JSON Schema object describing a tool's arguments.
 *
 * Deliberately structural rather than importing the MCP SDK's `Tool` type: the
 * registry is consumed by both the SDK-based stdio server and the
 * framework-free HTTP handler, and the HTTP path must not carry an SDK
 * dependency into a Next.js bundle.
 */
export interface JsonSchema {
  type: "object";
  properties?: Record<string, unknown>;
  required?: string[];
  [key: string]: unknown;
}

/**
 * Behavioural hints surfaced to clients and directories.
 *
 * Smithery, Claude Desktop and VS Code read these to decide whether a tool
 * needs confirmation before running, so every tool declares all four
 * explicitly rather than relying on SDK defaults.
 */
export interface ToolAnnotations {
  title?: string;
  readOnlyHint: boolean;
  destructiveHint: boolean;
  idempotentHint: boolean;
  openWorldHint: boolean;
}

/**
 * Permission class a tool needs.
 *
 * READ THIS BEFORE ENFORCING. MisarDev API keys (`mdk_`) currently grant FULL
 * API access — `createApiKey` stopped writing the `scopes` column and
 * `validateApiKey` never reads it (MisarDev `lib/api-keys/index.ts`). These
 * classes are therefore a classification of what each tool does, not a check
 * against a populated key field. A host must NOT pass `hasAnyScope` to the HTTP
 * handler until real key scopes exist on the live schema — a scope check that
 * reads an empty column looks like access control while enforcing nothing.
 */
export type ToolScope = "read" | "write" | "deploy" | "admin";

export type ToolCategory =
  | "projects"
  | "templates"
  | "deployments"
  | "builds"
  | "checkpoints"
  | "domains"
  | "search"
  | "code-index"
  | "account"
  | "connectors";

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: JsonSchema;
  annotations: ToolAnnotations;
  /** Grouping used by the README, docs and directory listings. */
  category: ToolCategory;
  /** Any ONE of these authorises the call. */
  scopes?: ToolScope[];
  handler: (ctx: McpContext, args: Record<string, unknown>) => Promise<unknown>;
}

/** Convenience builder so every tool file stays declarative. */
export function defineTool(def: ToolDefinition): ToolDefinition {
  return def;
}

/** Annotation presets — every tool still states all four hints, via one of these. */
export const READ: Omit<ToolAnnotations, "title"> = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};
