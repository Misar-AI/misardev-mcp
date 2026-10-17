# MisarDev MCP Server

> Create, build and deploy projects, roll back with checkpoints, connect custom domains, and search your code and the web — from any AI assistant.

[![npm](https://img.shields.io/npm/v/@misardev/mcp)](https://www.npmjs.com/package/@misardev/mcp)
[![smithery](https://img.shields.io/badge/smithery-misar%2Fmisardev--mcp-blue)](https://smithery.ai/server/misar/misardev-mcp)
[![license](https://img.shields.io/badge/license-MIT-green)](./LICENSE)

**54 tools · 5 prompts · 3 resources · 4 agent skills**

Works with Claude (Desktop, Code, and web), Cursor, VS Code, Windsurf, Cline,
Zed, Gemini CLI, ChatGPT, and any other MCP-compatible client — over stdio or
Streamable HTTP.

---

## Install

### Smithery (recommended)

```bash
npx -y @smithery/cli install misar/misardev-mcp --client claude
```

### Claude Code

```bash
claude mcp add misardev -- npx -y @misardev/mcp@latest
```

### Manual (any client)

```json
{
  "mcpServers": {
    "misardev": {
      "command": "npx",
      "args": ["-y", "@misardev/mcp@latest"],
      "env": { "MISARDEV_API_KEY": "mdk_your_key_here" }
    }
  }
}
```

Ready-made configs for every client live in [`connectors/`](./connectors).

### Remote (no install)

```json
{
  "mcpServers": {
    "misardev": {
      "type": "streamable-http",
      "url": "https://api.misar.io/dev/mcp",
      "headers": { "Authorization": "Bearer mdk_your_key_here" }
    }
  }
}
```

---

## Authentication

Create an API key at https://misar.dev/settings/api-keys (Settings → API keys) — it starts with
`mdk_` — and give it to the server in one of three ways: the
`MISARDEV_API_KEY` environment variable, your MCP client's `env` block, or
`{ "api_key": "mdk_…" }` in `~/.misardev/config.json`.

Self-hosted instances: set `MISARDEV_BASE_URL`.

---

## Tools

| Tool | Description |
| --- | --- |
| `list_projects` | List the projects you own or can access, newest first, with cursor pagination. |
| `get_project` | Get one project by ID — name, description, settings, visibility, version and deployment fields. |
| `create_project` | Create a new, empty project (optionally seeded with a file map). |
| `update_project` | Update a project's name, description, files, settings or visibility. |
| `delete_project` | Move a project to the trash. |
| `restore_project` | Restore a project from the trash. |
| `archive_project` | Archive (archived=true) or un-archive (archived=false) a project. |
| `duplicate_project` | Copy a project (files and settings) into a new project you own, named after the original. |
| `get_project_files` | Get a project's file tree with file contents. |
| `write_project_files` | Create, update or delete files in a project (1–100 per call, each up to 1 MB; paths are relative, no `..`). |
| `import_artifact` | Import a published Misar artifact page into a project as imported/ARTIFACT_ID.html. |
| `get_project_knowledge` | Read a project's knowledge — the standing notes (product context, conventions, constraints) the AI builder reads on every change.. |
| `update_project_knowledge` | Replace a project's knowledge (up to 20,000 characters) — the standing notes the AI builder reads on every change. |
| `get_project_backend` | Show a full-stack project's database backend: whether one is provisioned, its schema name, table count and connection state.. |
| `provision_project_backend` | Provision the database backend for a full-stack project: its own isolated schema, protected by row-level security. |
| `list_templates` | List the starter templates a new project can begin from, with their IDs, names and categories. |
| `get_template` | Get one template by ID — its description, stack and the files it would create.. |
| `use_template` | Create a new project from a template. |
| `deploy_project` | Publish a project to the public internet on the MisarDev runtime (optionally at a chosen subdomain). |
| `get_deployment_status` | Get a project's current deployment: whether it is live, its URL, subdomain and custom-domain state. |
| `unpublish_project` | Take a published site offline. |
| `check_subdomain` | Check whether a subdomain label is free for this project and, if not, get suggestions. |
| `update_project_subdomain` | Move a project to a new <subdomain>.misar.app address (check it first with check_subdomain). |
| `list_builds` | List your recent AI builds across all projects, newest first, with status, model and the project each belongs to.. |
| `get_build_status` | Get whether a project currently has a build running and its latest build state. |
| `cancel_build` | Cancel the build currently running on a project. |
| `list_checkpoints` | List a project's saved checkpoints (up to 100, newest first) with label, changed paths and timestamp. |
| `restore_checkpoint` | Restore a project's files to a checkpoint. |
| `rename_checkpoint` | Give a checkpoint a human-readable label (1–80 characters) so it is easy to find later.. |
| `delete_checkpoint` | Delete one checkpoint from a project's version history. |
| `get_custom_domain` | Get a project's custom domain, its status, the DNS record the user must set, and whether DNS already resolves to the platform (TLS is issued automatically once it does).. |
| `set_custom_domain` | Attach a domain the user owns to a published project and provision routing/TLS. |
| `remove_custom_domain` | Detach a project's custom domain and remove its route. |
| `lookup_domain` | Look up a domain's public registration data (RDAP): whether it is registered, its registrar and key dates. |
| `search_workspace` | Search across your projects and the public catalogue (templates, skills, the published gallery) by name and description. |
| `web_search` | Answer a question from the live web with citations (MisarDev's grounded search). |
| `create_chat_completion` | Run a one-shot, non-streaming chat completion on MisarDev's OpenAI-compatible model API. |
| `index_project_code` | Index a project's files for semantic code search (RAG). |
| `search_project_code` | Semantic search inside an indexed project's code. |
| `get_code_index_stats` | Get embedding statistics for a project — how many files and chunks are indexed and when.. |
| `clear_code_index` | Delete every embedding for a project. |
| `upgrade` | Show the current MisarDev plan, how much of each quota (builds, edits, projects) is left this period, and the link to compare plans and upgrade. |
| `get_usage` | Get detailed usage for the account. |
| `get_subscription` | Get the account's subscription: plan, status, current period end and whether it cancels at period end.. |
| `list_plans` | List MisarDev's plans with prices, limits and features — what each upgrade would unlock.. |
| `list_notifications` | List your notifications (build finished, deploy failed, invitations…), newest first, with the unread count. |
| `mark_notifications_read` | Mark every notification as read, clearing the unread badge. |
| `list_api_keys` | List your API keys — name, prefix, created/expiry dates and IP allowlist. |
| `create_api_key` | Create a new API key. |
| `revoke_api_key` | Revoke an API key by ID. |
| `mark_notification_read` | Mark one notification as read (use mark_notifications_read for all of them).. |
| `list_audit_log` | List your own audit trail — API-key, deployment and billing events where you were the actor, newest first. |
| `list_connectors` | List the connectors available on MisarDev and whether each is enabled for you, with its category, status and dashboard path.. |
| `toggle_connector` | Enable or disable a connector by slug (from list_connectors). |

## Prompts

Reusable workflows your client exposes as slash-commands.

| Prompt | Description |
| --- | --- |
| `ship_a_project` | Take a project from a template to a live, verified deployment. |
| `undo_a_bad_change` | Roll a project back to an earlier checkpoint and, if it was live, redeploy. |
| `deployment_health` | Review recent builds and deployments and say what needs attention. |
| `search_the_codebase` | Answer a question about a project from its indexed code. |
| `usage_and_keys_audit` | Review plan usage and API keys for anything unexpected. |

## Resources

Read-only context an agent can attach without spending a tool call.

| URI | Description |
| --- | --- |
| `misardev://projects` | Your active projects, newest first — the IDs every other tool takes.. |
| `misardev://templates` | Available starter templates, so a new project begins from a real one.. |
| `misardev://plan` | Current plan and remaining builds, edits and projects this period — the baseline for any quota question.. |

## Agent skills

Bundled in [`skills/`](./skills) — guidance an agent loads when a task matches.

| Skill | Use when |
| --- | --- |
| `connect-custom-domain` | Attach a domain the user owns to a published MisarDev project and walk them through the DNS record until TLS is live. Use for "use my own domain", custom domain setup, or a domain that is not serving yet. |
| `search-the-codebase` | Answer questions about a MisarDev project from its indexed code, citing the files used. Use when asked how something works, where code lives, or to explain part of a MisarDev project. |
| `ship-a-project` | Create a MisarDev project from a template and publish it, verifying the address before and the live site after. Use when asked to start, build, launch or deploy a project in MisarDev. |
| `undo-a-bad-change` | Roll a MisarDev project back to an earlier checkpoint and, if it is published, redeploy the restored version. Use when the user says a change broke something, wants the previous version back, or asks to undo. |

---

## Safety

Destructive and irreversible actions are annotated (`destructiveHint`) so
clients can prompt before running them. The skills instruct agents to confirm
before anything that sends mail, publishes content, or is otherwise visible to
other people.

Discovery (`initialize`, `tools/list`, `prompts/list`, `resources/list`)
never requires credentials, so registries can index the server without one.
Every action does.

---

## Links

- Website — https://misar.dev
- App — https://misar.dev
- Documentation — https://docs.misar.io/dev/mcp
- Smithery — https://smithery.ai/server/misar/misardev-mcp
- npm — https://www.npmjs.com/package/@misardev/mcp
- Source — https://github.com/Misar-AI/misardev-mcp

MIT © [Misar.AI](https://misar.io)
