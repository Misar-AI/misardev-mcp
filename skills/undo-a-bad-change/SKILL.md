---
name: undo-a-bad-change
description: Roll a MisarDev project back to an earlier checkpoint and, if it is published, redeploy the restored version. Use when the user says a change broke something, wants the previous version back, or asks to undo.
---

# Undo a bad change

Checkpoints are the project's version history. Restoring one is itself
undoable — the current state is snapshotted first — but it overwrites the
working files, and a published site does not change until it is redeployed.

## Steps

1. `list_checkpoints` for the project. Show the recent ones with their label,
   time and changed paths, so the user picks by what changed rather than by id.
2. If it helps them choose, `get_project_files` to show the current state of
   the files in question.
3. **Ask which checkpoint to restore.** Then `restore_checkpoint`.
4. `rename_checkpoint` on the snapshot the restore created (optional) with a
   label like "before rollback", so it is easy to find if they change their mind.
5. `get_deployment_status`. If the site is live, ask before calling
   `deploy_project` — redeploying is what actually changes the public site.

## Failure modes

- **A build is running.** `get_build_status`; restoring mid-build races the
  build's own writes. Wait, or `cancel_build` with the user's approval.
- **Conflict (409).** Someone else changed the project; re-read with
  `get_project` and confirm the choice again rather than retrying blindly.
- **There is no deploy history.** Only the current build is kept on the
  runtime, so "roll back the site" always means restore-then-deploy.
