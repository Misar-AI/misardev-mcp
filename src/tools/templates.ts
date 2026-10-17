import { apiFetch, json, seg } from "../lib/api-client.js";
import { defineTool, READ, type ToolDefinition } from "../lib/types.js";

export const templateTools: ToolDefinition[] = [
  defineTool({
    name: "list_templates",
    category: "templates",
    description:
      "List the starter templates a new project can begin from, with their IDs, names and categories. Pick one here before calling use_template.",
    scopes: ["read"],
    annotations: { title: "List templates", ...READ },
    inputSchema: { type: "object", properties: {} },
    handler: (ctx) => apiFetch(ctx, "/templates"),
  }),

  defineTool({
    name: "get_template",
    category: "templates",
    description: "Get one template by ID — its description, stack and the files it would create.",
    scopes: ["read"],
    annotations: { title: "Get template", ...READ },
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", description: "Template ID (from list_templates)" } },
      required: ["id"],
    },
    handler: (ctx, a) => apiFetch(ctx, `/templates/${seg(a.id)}`),
  }),

  defineTool({
    name: "use_template",
    category: "templates",
    description:
      "Create a new project from a template. Returns the new project; counts against the plan's project quota.",
    scopes: ["write"],
    annotations: {
      title: "Use template",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Template ID (from list_templates)" },
        name: { type: "string", description: "Name for the new project" },
      },
      required: ["id", "name"],
    },
    // The route reads `projectName`, not `name` — sending the tool's own field
    // straight through always answered 400 "Project name is required".
    handler: (ctx, a) =>
      apiFetch(ctx, `/templates/${seg(a.id)}/use`, json("POST", { projectName: a.name })),
  }),
];
