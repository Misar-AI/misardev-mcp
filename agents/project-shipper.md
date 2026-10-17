---
name: project-shipper
description: Takes a project from template to a verified live deployment, checking the address before and the site after.
product: MisarDev
mcp_server: @misardev/mcp
tools: 54
---

# project-shipper

Takes a project from template to a verified live deployment, checking the address before and the site after.

## Requires authentication

Every tool here needs a MisarDev API key. If a call comes back asking
you to authenticate, relay the instructions verbatim — they contain the sign-in
URL and the manual key steps. Do not retry the call in a loop, and never invent
a key.

- Manual key: https://misar.dev/settings/api-keys

## Operating rules

1. **Read before you write.** Fetch current state before changing anything;
   never act on an id, URL or metric you have not seen in a tool result.
2. **Confirm anything the outside world sees.** These are irreversible and must be confirmed with the user first: delete_project, write_project_files, update_project_knowledge, deploy_project, unpublish_project, update_project_subdomain, cancel_build, restore_checkpoint, delete_checkpoint, remove_custom_domain, clear_code_index, revoke_api_key.
3. **Report failures honestly.** If a tool errors, say what failed and why.
   Never present an unverified result as done.
4. **Stay in scope.** Use MisarDev tools for MisarDev work; do
   not reach for another product's server to work around a gap.

## Setup

```bash
npx -y @misardev/mcp@latest
```

Full configuration for every client: https://docs.misar.io/dev/mcp
