import { apiFetch, buildQuery, json, seg } from "../lib/api-client.js";
import { defineTool, READ, type ToolDefinition } from "../lib/types.js";

const ID = { id: { type: "string", description: "Project UUID" } } as const;

export const domainTools: ToolDefinition[] = [
  defineTool({
    name: "get_custom_domain",
    category: "domains",
    description:
      "Get a project's custom domain, its status, the DNS record the user must set, and whether DNS already resolves to the platform (TLS is issued automatically once it does).",
    scopes: ["read"],
    annotations: { title: "Get custom domain", ...READ, openWorldHint: true },
    inputSchema: { type: "object", properties: { ...ID }, required: ["id"] },
    handler: (ctx, a) => apiFetch(ctx, `/projects/${seg(a.id)}/domain`),
  }),

  defineTool({
    name: "set_custom_domain",
    category: "domains",
    description:
      "Attach a domain the user owns to a published project and provision routing/TLS. Pro, Team and Enterprise plans only — Free and Starter get an upgrade offer instead. Returns the DNS record to set — the domain only serves once that record is live.",
    scopes: ["deploy"],
    annotations: {
      title: "Set custom domain",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    inputSchema: {
      type: "object",
      properties: { ...ID, domain: { type: "string", description: "Domain to attach, e.g. app.example.com" } },
      required: ["id", "domain"],
    },
    handler: (ctx, a) => apiFetch(ctx, `/projects/${seg(a.id)}/domain`, json("POST", { domain: a.domain })),
  }),

  defineTool({
    name: "remove_custom_domain",
    category: "domains",
    description:
      "Detach a project's custom domain and remove its route. The domain stops serving the app immediately; the default subdomain keeps working. Confirm with the user first.",
    scopes: ["deploy"],
    annotations: {
      title: "Remove custom domain",
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: true,
    },
    inputSchema: { type: "object", properties: { ...ID }, required: ["id"] },
    handler: (ctx, a) => apiFetch(ctx, `/projects/${seg(a.id)}/domain`, json("DELETE")),
  }),

  defineTool({
    name: "lookup_domain",
    category: "domains",
    description:
      "Look up a domain's public registration data (RDAP): whether it is registered, its registrar and key dates. Useful before suggesting a custom domain.",
    scopes: ["read"],
    annotations: { title: "Look up domain", ...READ, openWorldHint: true },
    inputSchema: {
      type: "object",
      properties: { domain: { type: "string", description: "Domain name, e.g. example.com" } },
      required: ["domain"],
    },
    handler: (ctx, a) => apiFetch(ctx, `/domains/lookup${buildQuery({ domain: a.domain })}`),
  }),
];
