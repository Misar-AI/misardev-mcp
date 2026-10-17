import { apiFetch, buildQuery, json, seg } from "../lib/api-client.js";
import { defineTool, READ, type ToolDefinition } from "../lib/types.js";

export const buildTools: ToolDefinition[] = [
  defineTool({
    name: "list_builds",
    category: "builds",
    description:
      "List your recent AI builds across all projects, newest first, with status, model and the project each belongs to.",
    scopes: ["read"],
    annotations: { title: "List builds", ...READ },
    inputSchema: {
      type: "object",
      properties: { limit: { type: "number", description: "Max rows to return (default 20)" } },
    },
    handler: (ctx, a) => apiFetch(ctx, `/builds${buildQuery({ limit: a.limit })}`),
  }),

  defineTool({
    name: "get_build_status",
    category: "builds",
    description:
      "Get whether a project currently has a build running and its latest build state. Poll this rather than assuming a build finished.",
    scopes: ["read"],
    annotations: { title: "Get build status", ...READ },
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", description: "Project UUID" } },
      required: ["id"],
    },
    handler: (ctx, a) => apiFetch(ctx, `/projects/${seg(a.id)}/build-status`),
  }),

  defineTool({
    name: "cancel_build",
    category: "builds",
    description:
      "Cancel the build currently running on a project. Work the build had not yet saved is discarded.",
    scopes: ["write"],
    annotations: {
      title: "Cancel build",
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", description: "Project UUID" } },
      required: ["id"],
    },
    handler: (ctx, a) => apiFetch(ctx, `/projects/${seg(a.id)}/cancel-build`, json("POST", {})),
  }),
];
