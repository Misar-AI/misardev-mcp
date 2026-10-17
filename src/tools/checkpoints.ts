import { apiFetch, json, seg } from "../lib/api-client.js";
import { defineTool, READ, type ToolDefinition } from "../lib/types.js";

export const checkpointTools: ToolDefinition[] = [
  defineTool({
    name: "list_checkpoints",
    category: "checkpoints",
    description:
      "List a project's saved checkpoints (up to 100, newest first) with label, changed paths and timestamp. Checkpoints are the project's version history — use one to undo a bad change.",
    scopes: ["read"],
    annotations: { title: "List checkpoints", ...READ },
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", description: "Project UUID" } },
      required: ["id"],
    },
    handler: (ctx, a) => apiFetch(ctx, `/projects/${seg(a.id)}/checkpoints`),
  }),

  defineTool({
    name: "restore_checkpoint",
    category: "checkpoints",
    description:
      "Restore a project's files to a checkpoint. The current state is snapshotted first, so the restore itself can be undone — but it does overwrite the working files, so confirm with the user. A published site does not change until you deploy again.",
    scopes: ["write"],
    annotations: {
      title: "Restore checkpoint",
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      properties: { checkpoint_id: { type: "string", description: "Checkpoint ID (from list_checkpoints)" } },
      required: ["checkpoint_id"],
    },
    handler: (ctx, a) => apiFetch(ctx, `/checkpoints/${seg(a.checkpoint_id)}/restore`, json("POST", {})),
  }),

  defineTool({
    name: "rename_checkpoint",
    category: "checkpoints",
    description: "Give a checkpoint a human-readable label (1–80 characters) so it is easy to find later.",
    scopes: ["write"],
    annotations: {
      title: "Rename checkpoint",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      properties: {
        checkpoint_id: { type: "string", description: "Checkpoint ID (from list_checkpoints)" },
        label: { type: "string", description: "New label, 1–80 characters" },
      },
      required: ["checkpoint_id", "label"],
    },
    handler: (ctx, a) =>
      apiFetch(ctx, `/checkpoints/${seg(a.checkpoint_id)}`, json("PATCH", { label: a.label })),
  }),

  defineTool({
    name: "delete_checkpoint",
    category: "checkpoints",
    description:
      "Delete one checkpoint from a project's version history. It can no longer be restored afterwards, and the last remaining checkpoint cannot be deleted. Confirm with the user first.",
    scopes: ["write"],
    annotations: {
      title: "Delete checkpoint",
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      properties: { checkpoint_id: { type: "string", description: "Checkpoint ID (from list_checkpoints)" } },
      required: ["checkpoint_id"],
    },
    handler: (ctx, a) => apiFetch(ctx, `/checkpoints/${seg(a.checkpoint_id)}`, { method: "DELETE" }),
  }),
];
