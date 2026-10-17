import { apiFetch, buildQuery, json, seg } from "../lib/api-client.js";
import { defineTool, READ, type ToolDefinition } from "../lib/types.js";

const ID = { id: { type: "string", description: "Project UUID (from list_projects)" } } as const;

export const deploymentTools: ToolDefinition[] = [
  defineTool({
    name: "deploy_project",
    category: "deployments",
    description:
      "Publish a project to the public internet on the MisarDev runtime (optionally at a chosen subdomain). The site becomes reachable by anyone. Confirm with the user before calling, check the address first with check_subdomain, and follow with get_deployment_status. Counts against the plan's deploy quota.",
    scopes: ["deploy"],
    annotations: {
      title: "Deploy project",
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: true,
    },
    inputSchema: {
      type: "object",
      properties: {
        ...ID,
        subdomain: {
          type: "string",
          description: "Subdomain label to publish at (e.g. 'my-app'); omit to keep the current one",
        },
        public_gallery: {
          type: "boolean",
          description: "List the published app in the public showcase (omit to leave unchanged)",
        },
      },
      required: ["id"],
    },
    // The route calls request.json() unconditionally, so a request with no
    // body at all failed server-side with a 500 — always send an object.
    handler: (ctx, a) =>
      apiFetch(
        ctx,
        `/projects/${seg(a.id)}/deploy`,
        json("POST", { subdomain: a.subdomain, publicGallery: a.public_gallery }),
      ),
  }),

  defineTool({
    name: "get_deployment_status",
    category: "deployments",
    description:
      "Get a project's current deployment: whether it is live, its URL, subdomain and custom-domain state. Call after deploy_project to confirm the site is actually up before telling anyone it is.",
    scopes: ["read"],
    annotations: { title: "Get deployment status", ...READ, openWorldHint: true },
    inputSchema: { type: "object", properties: { ...ID }, required: ["id"] },
    handler: (ctx, a) => apiFetch(ctx, `/projects/${seg(a.id)}/deploy`),
  }),

  defineTool({
    name: "unpublish_project",
    category: "deployments",
    description:
      "Take a published site offline. Its public URL stops serving immediately. This is not a rollback — to go back to an earlier version, restore_checkpoint and deploy again. Confirm with the user first.",
    scopes: ["deploy"],
    annotations: {
      title: "Unpublish project",
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: true,
    },
    inputSchema: { type: "object", properties: { ...ID }, required: ["id"] },
    handler: (ctx, a) => apiFetch(ctx, `/projects/${seg(a.id)}/deploy`, json("DELETE")),
  }),

  defineTool({
    name: "check_subdomain",
    category: "deployments",
    description:
      "Check whether a subdomain label is free for this project and, if not, get suggestions. The project's own current subdomain reads as available.",
    scopes: ["read"],
    annotations: { title: "Check subdomain", ...READ },
    inputSchema: {
      type: "object",
      properties: { ...ID, subdomain: { type: "string", description: "Label to check, e.g. 'my-app'" } },
      required: ["id", "subdomain"],
    },
    handler: (ctx, a) =>
      apiFetch(ctx, `/projects/${seg(a.id)}/subdomain/check${buildQuery({ value: a.subdomain })}`),
  }),

  defineTool({
    name: "update_project_subdomain",
    category: "deployments",
    description:
      "Move a project to a new <subdomain>.misar.app address (check it first with check_subdomain). If the app is published, the live site moves immediately and the OLD address stops working — get the user's explicit approval. If it is not published yet, this just reserves the name for the next deploy.",
    scopes: ["deploy"],
    annotations: {
      title: "Change project subdomain",
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: true,
    },
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Project UUID" },
        subdomain: { type: "string", description: "New subdomain, without .misar.app" },
      },
      required: ["id", "subdomain"],
    },
    handler: (ctx, a) => apiFetch(ctx, `/projects/${seg(a.id)}/subdomain`, json("PATCH", { subdomain: a.subdomain })),
  }),
];
