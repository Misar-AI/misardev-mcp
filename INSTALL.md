# Installing MisarDev — every platform

Create, build and deploy projects, roll back with checkpoints, connect custom domains, and search your code and the web — from any AI assistant.

54 tools · 5 prompts ·
3 resources · 3 agents

**Authentication is required for every tool.** Create a key at
https://misar.dev/settings/api-keys (Settings → API keys) and set `MISARDEV_API_KEY`.

## Desktop, CLI and IDE (stdio)

| Platform | Where | Artifact |
| --- | --- | --- |
| Claude Desktop | `claude_desktop_config.json` | `connectors/claude-desktop.json` |
| Claude Code (CLI) | `claude mcp add` or `.mcp.json` | `connectors/claude-code.json`, `.mcp.json` |
| Claude plugin / marketplace | `/plugin marketplace add` | `.claude-plugin/` |
| Cursor | Settings → MCP | `connectors/cursor.json` |
| VS Code (incl. Copilot agent mode) | `.vscode/mcp.json` | `connectors/vscode.json` |
| Visual Studio | MCP settings | `connectors/visual-studio.json` |
| JetBrains IDEs | AI Assistant → MCP | `connectors/jetbrains.json` |
| Windsurf | `mcp_config.json` | `connectors/windsurf.json` |
| Cline | MCP servers | `connectors/cline.json` |
| Zed | `settings.json` → context_servers | `connectors/zed.json` |
| Codex (CLI/app) | `~/.codex/config.toml` | `connectors/codex.toml` |
| Gemini CLI | `settings.json` | `connectors/gemini-cli.json` |

All of the above run:

```bash
npx -y @misardev/mcp@latest
```

## Web and hosted

| Platform | How | Artifact | Notes |
| --- | --- | --- | --- |
| Claude.ai (web) | Custom connector | `connectors/claude-web.json` | Remote URL: `https://api.misar.io/dev/mcp` |
| Smithery | `npx -y @smithery/cli install misar/misardev-mcp --client claude` | `smithery.yaml` | Hosted, no local install |
| ChatGPT (Custom GPT) | Actions → import schema | `customgpt/openapi.json` + `customgpt/gpt-config.json` | Bearer auth with your API key |
| ChatGPT (native MCP) | Settings → Connected apps → Add connector | `connectors/chatgpt-mcp.json` | Streamable HTTP + bearer auth |
| ChatGPT Apps SDK | platform.openai.com developer portal | `apps-sdk/manifest.json` | Submit manifest + OpenAPI spec |
| Any MCP client over HTTP | Streamable HTTP | `connectors/remote-http.json` | `https://api.misar.io/dev/mcp` |
| MCP registry | `server.json` | `server.json`, `.well-known/` | `io.github.Misar-AI/misardev-mcp` |

## Agents and skills

- **Agents** — `agents/*.md`: task-scoped personas with the rules for using
  these tools safely.
- **Skills** — `skills/*/SKILL.md`: one workflow each, for clients that load
  skill folders.

A skill teaches one workflow; an agent owns a job and picks workflows.

## Verifying

```bash
# Discovery works with no credentials — tools/list must answer
npx -y @misardev/mcp@latest <<< '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

Every tool call without a key returns setup instructions naming the sign-in URL,
the dashboard URL, and where to put the key.

Docs: https://docs.misar.io/dev/mcp
