import { apiFetch, buildQuery, json, seg } from "../lib/api-client.js";
import { defineTool, READ, type ToolDefinition } from "../lib/types.js";

const ID = { id: { type: "string", description: "Project UUID (from list_projects)" } } as const;

export const projectTools: ToolDefinition[] = [
  defineTool({
    name: "list_projects",
    category: "projects",
    description:
      "List the projects you own or can access, newest first, with cursor pagination. view=active (default) hides archived and trashed projects; pass view=archived or view=trash to see those.",
    scopes: ["read"],
    annotations: { title: "List projects", ...READ },
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Results per page (default 20, max 100)" },
        cursor: { type: "string", description: "Project ID to start after (from the previous page)" },
        view: {
          type: "string",
          enum: ["active", "archived", "trash"],
          description: "Which lifecycle view to list (default active)",
        },
      },
    },
    handler: (ctx, a) =>
      apiFetch(ctx, `/projects${buildQuery({ limit: a.limit, cursor: a.cursor, view: a.view })}`),
  }),

  defineTool({
    name: "get_project",
    category: "projects",
    description:
      "Get one project by ID — name, description, settings, visibility, version and deployment fields. Read this before update_project so you change the current version, not a stale copy.",
    scopes: ["read"],
    annotations: { title: "Get project", ...READ },
    inputSchema: { type: "object", properties: { ...ID }, required: ["id"] },
    handler: (ctx, a) => apiFetch(ctx, `/projects/${seg(a.id)}`),
  }),

  defineTool({
    name: "create_project",
    category: "projects",
    description:
      "Create a new, empty project (optionally seeded with a file map). Counts against the plan's project quota. To start from a starter instead, use use_template.",
    scopes: ["write"],
    annotations: {
      title: "Create project",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Project name (max 100 chars)" },
        description: { type: "string", description: "Optional project description" },
        files: {
          type: "object",
          description: "Initial file map: keys are relative file paths, values are file contents",
        },
        settings: { type: "object", description: "Project settings (e.g. framework, styling)" },
      },
      required: ["name"],
    },
    handler: (ctx, a) =>
      apiFetch(
        ctx,
        "/projects",
        json("POST", { name: a.name, description: a.description, files: a.files, settings: a.settings }),
      ),
  }),

  defineTool({
    name: "update_project",
    category: "projects",
    description:
      "Update a project's name, description, files, settings or visibility. Files passed here REPLACE the matching paths. Pass the `version` you read with get_project to avoid overwriting someone else's newer edit (the API answers 409 on a conflict).",
    scopes: ["write"],
    annotations: {
      title: "Update project",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      properties: {
        ...ID,
        name: { type: "string", description: "New project name" },
        description: { type: "string", description: "New description" },
        files: { type: "object", description: "File map to write: path → content" },
        settings: { type: "object", description: "Updated settings" },
        is_public: { type: "boolean", description: "Make the project public (true) or private (false)" },
        version: { type: "number", description: "Version read from get_project, for conflict detection" },
      },
      required: ["id"],
    },
    handler: (ctx, a) =>
      apiFetch(
        ctx,
        `/projects/${seg(a.id)}`,
        json("PATCH", {
          name: a.name,
          description: a.description,
          files: a.files,
          settings: a.settings,
          is_public: a.is_public,
          version: a.version,
        }),
      ),
  }),

  defineTool({
    name: "delete_project",
    category: "projects",
    description:
      "Move a project to the trash. It disappears from every list and route immediately; restore_project brings it back during the retention window. Confirm with the user first — anything published from it stops being editable.",
    scopes: ["write"],
    annotations: {
      title: "Delete project",
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: { type: "object", properties: { ...ID }, required: ["id"] },
    handler: (ctx, a) => apiFetch(ctx, `/projects/${seg(a.id)}`, json("DELETE")),
  }),

  defineTool({
    name: "restore_project",
    category: "projects",
    description:
      "Restore a project from the trash. A project that was archived before it was trashed returns to the archive, not to the active list.",
    scopes: ["write"],
    annotations: {
      title: "Restore project",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: { type: "object", properties: { ...ID }, required: ["id"] },
    handler: (ctx, a) => apiFetch(ctx, `/projects/${seg(a.id)}`, json("POST", {})),
  }),

  defineTool({
    name: "archive_project",
    category: "projects",
    description:
      "Archive (archived=true) or un-archive (archived=false) a project. Archiving hides it from the active list without deleting anything; it is fully reversible.",
    scopes: ["write"],
    annotations: {
      title: "Archive project",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      properties: {
        ...ID,
        archived: { type: "boolean", description: "true to archive, false to bring it back" },
      },
      required: ["id", "archived"],
    },
    handler: (ctx, a) =>
      apiFetch(ctx, `/projects/${seg(a.id)}/archive`, json("POST", { archived: a.archived === true })),
  }),

  defineTool({
    name: "duplicate_project",
    category: "projects",
    description:
      "Copy a project (files and settings) into a new project you own, named after the original. Counts against the plan's project quota. Any member with read access may duplicate.",
    scopes: ["write"],
    annotations: {
      title: "Duplicate project",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
    inputSchema: { type: "object", properties: { ...ID }, required: ["id"] },
    handler: (ctx, a) => apiFetch(ctx, `/projects/${seg(a.id)}/duplicate`, json("POST", {})),
  }),

  defineTool({
    name: "get_project_files",
    category: "projects",
    description:
      "Get a project's file tree with file contents. Use this to read code before answering questions about it or proposing an update_project change.",
    scopes: ["read"],
    annotations: { title: "Get project files", ...READ },
    inputSchema: { type: "object", properties: { ...ID }, required: ["id"] },
    handler: (ctx, a) => apiFetch(ctx, `/projects/${seg(a.id)}/files`),
  }),

  defineTool({
    name: "write_project_files",
    category: "projects",
    description:
      "Create, update or delete files in a project (1–100 per call, each up to 1 MB; paths are relative, no `..`). Other files are left as they are. Overwrites and deletes are applied to the working files immediately — confirm with the user, and use list_checkpoints/restore_checkpoint to undo. Pass `version` (from get_project) to refuse the write if anything changed since you read it. The published site does not change until you deploy again.",
    scopes: ["write"],
    annotations: {
      title: "Write project files",
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Project UUID" },
        files: {
          type: "array",
          minItems: 1,
          maxItems: 100,
          description: "Files to write",
          items: {
            type: "object",
            properties: {
              path: { type: "string", description: "Relative path, e.g. src/App.tsx" },
              content: { type: "string", description: "Full file contents (send \"\" for a delete)" },
              language: { type: "string", description: "Optional language hint, e.g. typescript" },
              action: { type: "string", enum: ["create", "update", "delete"], description: "Default update" },
            },
            required: ["path", "content"],
          },
        },
        version: { type: "integer", minimum: 0, description: "Optional: the project version you last read" },
      },
      required: ["id", "files"],
    },
    handler: (ctx, a) => {
      const body: Record<string, unknown> = { files: a.files };
      if (a.version !== undefined) body.version = a.version;
      return apiFetch(ctx, `/projects/${seg(a.id)}/files`, json("POST", body));
    },
  }),

  defineTool({
    name: "import_artifact",
    category: "projects",
    description:
      "Import a published Misar artifact page into a project as imported/ARTIFACT_ID.html. The url must be exactly https://misar.ai/code/artifact/ARTIFACT_ID; anything else is refused before any fetch.",
    scopes: ["write"],
    annotations: {
      title: "Import artifact into project",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Project UUID" },
        url: { type: "string", description: "Artifact URL: https://misar.ai/code/artifact/ARTIFACT_ID" },
      },
      required: ["id", "url"],
    },
    handler: (ctx, a) => apiFetch(ctx, `/projects/${seg(a.id)}/import-artifact`, json("POST", { url: a.url })),
  }),

  defineTool({
    name: "get_project_knowledge",
    category: "projects",
    description:
      "Read a project's knowledge — the standing notes (product context, conventions, constraints) the AI builder reads on every change.",
    scopes: ["read"],
    annotations: { title: "Get project knowledge", ...READ },
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", description: "Project UUID" } },
      required: ["id"],
    },
    handler: (ctx, a) => apiFetch(ctx, `/projects/${seg(a.id)}/knowledge`),
  }),

  defineTool({
    name: "update_project_knowledge",
    category: "projects",
    description:
      "Replace a project's knowledge (up to 20,000 characters) — the standing notes the AI builder reads on every change. This replaces the whole text, so read it with get_project_knowledge first and send the edited version.",
    scopes: ["write"],
    annotations: {
      title: "Update project knowledge",
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Project UUID" },
        content: { type: "string", maxLength: 20000, description: "The full knowledge text" },
      },
      required: ["id", "content"],
    },
    handler: (ctx, a) => apiFetch(ctx, `/projects/${seg(a.id)}/knowledge`, json("PUT", { content: a.content })),
  }),

  defineTool({
    name: "get_project_backend",
    category: "projects",
    description:
      "Show a full-stack project's database backend: whether one is provisioned, its schema name, table count and connection state.",
    scopes: ["read"],
    annotations: { title: "Get project backend", ...READ },
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", description: "Project UUID" } },
      required: ["id"],
    },
    handler: (ctx, a) => apiFetch(ctx, `/projects/${seg(a.id)}/backend`),
  }),

  defineTool({
    name: "provision_project_backend",
    category: "projects",
    description:
      "Provision the database backend for a full-stack project: its own isolated schema, protected by row-level security. Safe to repeat — an already-provisioned project reports its existing backend.",
    scopes: ["write"],
    annotations: {
      title: "Provision project backend",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", description: "Project UUID" } },
      required: ["id"],
    },
    handler: (ctx, a) => apiFetch(ctx, `/projects/${seg(a.id)}/backend`, json("POST", { action: "provision" })),
  }),
];
