import { apiFetch, buildQuery, json } from "../lib/api-client.js";
import { defineTool, READ, type ToolDefinition } from "../lib/types.js";

const PROJECT = { project_id: { type: "string", description: "Project UUID" } } as const;

/** Accept the pre-3.0 `projectId` spelling too, so the rag_* aliases keep working. */
const pid = (a: Record<string, unknown>) => a.project_id ?? a.projectId;

export const codeIndexTools: ToolDefinition[] = [
  defineTool({
    name: "index_project_code",
    category: "code-index",
    description:
      "Index a project's files for semantic code search (RAG). Pass the files to index as a path → content map; re-indexing a path replaces it. Metered — a paid-plan feature.",
    scopes: ["write"],
    annotations: {
      title: "Index project code",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      properties: {
        ...PROJECT,
        // POST /rag validates this with the same filesSchema as create_project:
        // a path → content MAP. An array of {path, content} always answered 400.
        files: {
          type: "object",
          description: "File map to index: keys are file paths, values are file contents",
        },
      },
      required: ["project_id", "files"],
    },
    handler: (ctx, a) => apiFetch(ctx, "/rag", json("POST", { projectId: pid(a), files: a.files })),
  }),

  defineTool({
    name: "search_project_code",
    category: "code-index",
    description:
      "Semantic search inside an indexed project's code. Answer only from the snippets it returns and cite their file paths; if get_code_index_stats shows nothing indexed, index first.",
    scopes: ["read"],
    annotations: { title: "Search project code", ...READ },
    inputSchema: {
      type: "object",
      properties: { ...PROJECT, query: { type: "string", description: "Natural-language search query" } },
      required: ["project_id", "query"],
    },
    handler: (ctx, a) => apiFetch(ctx, `/rag${buildQuery({ projectId: pid(a), query: a.query })}`),
  }),

  defineTool({
    name: "get_code_index_stats",
    category: "code-index",
    description: "Get embedding statistics for a project — how many files and chunks are indexed and when.",
    scopes: ["read"],
    annotations: { title: "Get code index stats", ...READ },
    inputSchema: { type: "object", properties: { ...PROJECT }, required: ["project_id"] },
    handler: (ctx, a) => apiFetch(ctx, `/rag${buildQuery({ projectId: pid(a), stats: "true" })}`),
  }),

  defineTool({
    name: "clear_code_index",
    category: "code-index",
    description:
      "Delete every embedding for a project. Code search returns nothing until the project is indexed again. Project files are not touched.",
    scopes: ["write"],
    annotations: {
      title: "Clear code index",
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: { type: "object", properties: { ...PROJECT }, required: ["project_id"] },
    handler: (ctx, a) => apiFetch(ctx, `/rag${buildQuery({ projectId: pid(a) })}`, json("DELETE")),
  }),
];
