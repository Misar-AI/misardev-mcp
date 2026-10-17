import { apiFetch, json, seg } from "../lib/api-client.js";
import { defineTool, READ, type ToolDefinition } from "../lib/types.js";

/*
 * The CodeShield / DeployMesh / DocForge / ChainWard consoles were removed from
 * MisarDev on 2026-09-06 (routes, registry entries and their tables), so the
 * five tools that drove them — codeshield_scan, codeshield_findings,
 * deploymesh_batches, deploymesh_rollback, chainward_scan — were dropped in
 * 3.0.0. Every one of them could only ever return a 404.
 */
export const connectorTools: ToolDefinition[] = [
  defineTool({
    name: "list_connectors",
    category: "connectors",
    description:
      "List the connectors available on MisarDev and whether each is enabled for you, with its category, status and dashboard path.",
    scopes: ["read"],
    annotations: { title: "List connectors", ...READ },
    inputSchema: { type: "object", properties: {} },
    handler: (ctx) => apiFetch(ctx, "/connectors"),
  }),

  defineTool({
    name: "toggle_connector",
    category: "connectors",
    description: "Enable or disable a connector by slug (from list_connectors). Reversible.",
    scopes: ["write"],
    annotations: {
      title: "Toggle connector",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      properties: {
        slug: { type: "string", description: "Connector slug (from list_connectors)" },
        enabled: { type: "boolean", description: "true to enable, false to disable" },
      },
      required: ["slug", "enabled"],
    },
    handler: (ctx, a) =>
      apiFetch(ctx, `/connectors/${seg(a.slug)}/toggle`, json("POST", { enabled: a.enabled === true })),
  }),
];
