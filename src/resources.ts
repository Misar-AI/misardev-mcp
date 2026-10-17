import { apiFetch } from "./lib/api-client.js";
import type { McpContext } from "./lib/context.js";

/**
 * MCP resources — read-only context a client can attach without spending a tool
 * call. Kept small and cheap: some clients fetch every resource eagerly.
 */

export interface ResourceDefinition {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
  read: (ctx: McpContext) => Promise<unknown>;
}

export const RESOURCES: ResourceDefinition[] = [
  {
    uri: "misardev://projects",
    name: "Projects",
    description: "Your active projects, newest first — the IDs every other tool takes.",
    mimeType: "application/json",
    read: (ctx) => apiFetch(ctx, "/projects?limit=50"),
  },
  {
    uri: "misardev://templates",
    name: "Templates",
    description: "Available starter templates, so a new project begins from a real one.",
    mimeType: "application/json",
    read: (ctx) => apiFetch(ctx, "/templates"),
  },
  {
    uri: "misardev://plan",
    name: "Plan and quota",
    description: "Current plan and remaining builds, edits and projects this period — the baseline for any quota question.",
    mimeType: "application/json",
    read: (ctx) => apiFetch(ctx, "/usage/plan"),
  },
];

const BY_URI = new Map(RESOURCES.map((r) => [r.uri, r]));

export function listResources() {
  return RESOURCES.map(({ uri, name, description, mimeType }) => ({ uri, name, description, mimeType }));
}

export async function readResource(uri: string, ctx: McpContext) {
  const resource = BY_URI.get(uri);
  if (!resource) return null;
  const data = await resource.read(ctx);
  return { contents: [{ uri, mimeType: resource.mimeType, text: JSON.stringify(data, null, 2) }] };
}
