/**
 * Reusable prompt templates exposed over MCP `prompts/list` / `prompts/get`.
 *
 * TEMPLATES executed by the calling client's model — never server-side
 * completions, which spend credits on text the client cannot steer and cannot
 * work on stdio where no inference credential exists.
 *
 * Every tool named below is a real tool in `src/tools/`.
 */

export interface PromptArgument {
  name: string;
  description: string;
  required: boolean;
}

export interface PromptDefinition {
  name: string;
  description: string;
  arguments: PromptArgument[];
  build: (args: Record<string, string>) => string;
}

export const PROMPTS: PromptDefinition[] = [
  {
    name: "ship_a_project",
    description: "Take a project from a template to a live, verified deployment.",
    arguments: [
      { name: "name", description: "Project name", required: true },
      { name: "template", description: "Template to start from", required: false },
      { name: "subdomain", description: "Preferred subdomain", required: false },
    ],
    build: (a) =>
      `Set up and deploy a project called "${a.name || "my-app"}".\n\n` +
      "1. Call list_templates and pick one" +
      (a.template ? ` (I suggested ${a.template})` : "") +
      ", then call use_template.\n" +
      "2. Call get_project_files and summarise what was created.\n" +
      `3. Call check_subdomain${a.subdomain ? ` for "${a.subdomain}"` : ""} and show me the address.\n` +
      "4. Only after I confirm, call deploy_project — it publishes to the public internet.\n" +
      "5. Call get_deployment_status and report the live URL only once it says the site is up.\n\n" +
      "Never deploy to 'see if it works'.",
  },
  {
    name: "undo_a_bad_change",
    description: "Roll a project back to an earlier checkpoint and, if it was live, redeploy.",
    arguments: [{ name: "project", description: "Project ID or name", required: true }],
    build: (a) =>
      `Something broke in ${a.project || "my project"}. Help me roll it back.\n\n` +
      "1. Call list_checkpoints and show me the recent ones with their changed paths.\n" +
      "2. Ask which checkpoint to restore. Only after I choose, call restore_checkpoint " +
      "(the current state is snapshotted first, so this is undoable).\n" +
      "3. Call get_deployment_status. If the site is live, ask before calling deploy_project " +
      "again — the published site does not change until it is redeployed.",
  },
  {
    name: "deployment_health",
    description: "Review recent builds and deployments and say what needs attention.",
    arguments: [{ name: "project", description: "Project ID or name", required: false }],
    build: (a) =>
      `Review build and deployment health${a.project ? ` for ${a.project}` : ""}.\n\n` +
      "Call list_builds, then get_build_status and get_deployment_status for the affected " +
      "projects, and get_custom_domain where a custom domain is set.\n\n" +
      "Report what is live, what failed, and any domain whose DNS does not resolve yet. " +
      "Do not call unpublish_project, cancel_build or deploy_project without my explicit approval.",
  },
  {
    name: "search_the_codebase",
    description: "Answer a question about a project from its indexed code.",
    arguments: [
      { name: "question", description: "What you want to know", required: true },
      { name: "project", description: "Project ID or name", required: false },
    ],
    build: (a) =>
      `Answer this from my code: ${a.question || "(my question)"}\n` +
      `${a.project ? `Project: ${a.project}\n` : ""}\n` +
      "1. Call get_code_index_stats to confirm the project is indexed. If it is not, say so and " +
      "ask before calling index_project_code (it is metered).\n" +
      "2. Call search_project_code.\n" +
      "3. Call get_project_files to read anything the search points at.\n\n" +
      "Answer only from what you actually retrieved and name the files you used.",
  },
  {
    name: "usage_and_keys_audit",
    description: "Review plan usage and API keys for anything unexpected.",
    arguments: [],
    build: () =>
      "Audit my MisarDev account.\n\n" +
      "Call upgrade for plan usage, get_usage for the detail, list_api_keys, and list_connectors.\n\n" +
      "Flag quotas close to their limit, keys that are near expiry or look unused, and connectors " +
      "that are enabled but idle. Recommend which keys to revoke — but do not call revoke_api_key " +
      "without my explicit approval, since anything still using that key breaks immediately.",
  },
];

const BY_NAME = new Map(PROMPTS.map((p) => [p.name, p]));

export function listPrompts() {
  return PROMPTS.map(({ name, description, arguments: args }) => ({ name, description, arguments: args }));
}

export function getPrompt(name: string, args: Record<string, string> = {}) {
  const prompt = BY_NAME.get(name);
  if (!prompt) return null;
  return {
    description: prompt.description,
    messages: [{ role: "user" as const, content: { type: "text" as const, text: prompt.build(args) } }],
  };
}
