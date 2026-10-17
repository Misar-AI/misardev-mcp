import { apiFetch, buildQuery, json } from "../lib/api-client.js";
import { defineTool, READ, type ToolDefinition } from "../lib/types.js";

export const searchTools: ToolDefinition[] = [
  defineTool({
    name: "search_workspace",
    category: "search",
    description:
      "Search across your projects and the public catalogue (templates, skills, the published gallery) by name and description. Does NOT search inside project files — use search_project_code for that. A source that could not be reached is reported as unavailable, never as zero results.",
    scopes: ["read"],
    annotations: { title: "Search workspace", ...READ },
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search term (very short terms return an empty answer)" },
        limit: { type: "number", description: "Rows across all sources (default 20, max 50)" },
        types: {
          type: "string",
          description: "Comma-separated subset of project,template,skill,gallery (default: all)",
        },
      },
      required: ["query"],
    },
    handler: (ctx, a) =>
      apiFetch(ctx, `/search${buildQuery({ q: a.query, limit: a.limit, types: a.types })}`),
  }),

  defineTool({
    name: "web_search",
    category: "search",
    description:
      "Answer a question from the live web with citations (MisarDev's grounded search). Returns the answer, url_citation annotations and the ranked sources. Spends model credits; quote only what the sources support.",
    scopes: ["read"],
    annotations: {
      title: "Web search",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "The question or search query" },
        search_context_size: {
          type: "string",
          enum: ["low", "medium", "high"],
          description: "How much web context to gather (default medium)",
        },
      },
      required: ["query"],
    },
    handler: (ctx, a) =>
      apiFetch(ctx, "/v1/search", json("POST", { query: a.query, search_context_size: a.search_context_size })),
  }),

  defineTool({
    name: "create_chat_completion",
    category: "search",
    description:
      "Run a one-shot, non-streaming chat completion on MisarDev's OpenAI-compatible model API. model='misar-online' grounds the answer in the web with citations; omit model for the default coding model. Spends model credits.",
    scopes: ["read"],
    annotations: {
      title: "Chat completion",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
    inputSchema: {
      type: "object",
      properties: {
        messages: {
          type: "array",
          description: "OpenAI-style messages: [{ role: 'system'|'user'|'assistant', content: string }]",
          items: {
            type: "object",
            properties: {
              role: { type: "string", enum: ["system", "user", "assistant"] },
              content: { type: "string" },
            },
            required: ["role", "content"],
          },
          minItems: 1,
        },
        model: { type: "string", description: "Model id; 'misar-online' or 'misar-search' for web-grounded answers" },
        temperature: { type: "number", description: "Sampling temperature" },
        max_tokens: { type: "number", description: "Maximum tokens to generate" },
      },
      required: ["messages"],
    },
    handler: (ctx, a) =>
      apiFetch(
        ctx,
        "/v1/chat/completions",
        json("POST", {
          model: a.model,
          messages: a.messages,
          temperature: a.temperature,
          max_tokens: a.max_tokens,
          stream: false,
        }),
      ),
  }),
];
