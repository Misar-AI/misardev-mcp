---
name: ship-a-project
description: Create a MisarDev project from a template and publish it, verifying the address before and the live site after. Use when asked to start, build, launch or deploy a project in MisarDev.
---

# Ship a project

`deploy_project` puts the site on the public internet. Everything before it is
reversible; it is not something to run "to see if it works".

## Steps

1. `list_templates`, then `get_template` for the one that fits the request.
2. `use_template` with the project name. (Use `create_project` only when the
   user wants an empty project or supplies their own files.)
3. `get_project_files` — summarise what was actually created, so the user is
   approving real code, not a template name.
4. `check_subdomain` with the address they want. If it is taken, offer the
   suggestions it returns rather than inventing one.
5. **Ask for explicit approval**, naming the address. Then `deploy_project`.
6. `get_deployment_status`. Only report the live URL once this says the site is
   up. A deploy call that returned is not the same as a site that is serving.

## Failure modes

- **Plan limit.** A blocked deploy or project creation comes back as an upgrade
  card. Relay it as-is; do not retry in a loop. `upgrade` shows how much quota
  is left before you start.
- **Build still running.** `get_build_status` — deploying mid-build ships a half
  state. Wait or `cancel_build` (ask first; unsaved build work is discarded).
- **Wrong version shipped.** `list_checkpoints` + `restore_checkpoint`, then
  deploy again — see the `undo-a-bad-change` skill. `unpublish_project` takes
  the site offline entirely and is the last resort, not the first.
