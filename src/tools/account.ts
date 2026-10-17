import { execFileSync } from "node:child_process";
import { apiFetch, buildQuery, json, seg } from "../lib/api-client.js";
import { defineTool, READ, type ToolDefinition } from "../lib/types.js";

/** Where a MisarDev user compares plans and upgrades. */
export const PRICING_URL = "https://misar.dev/pricing";

interface UsageMeter {
  used: number;
  limit: number | null;
  remaining: number | null;
}

interface PlanUsage {
  plan: string;
  planName: string;
  subscriptionStatus: string;
  builds: UsageMeter;
  edits: UsageMeter;
  projects: UsageMeter;
  periodEnd: string;
  daysRemaining: number;
}

function openBrowser(url: string): void {
  try {
    if (process.platform === "darwin") execFileSync("open", [url], { stdio: "ignore" });
    else if (process.platform === "win32") execFileSync("cmd.exe", ["/c", "start", "", url], { stdio: "ignore" });
    else execFileSync("xdg-open", [url], { stdio: "ignore" });
  } catch {
    // Headless/SSH — the URL is in the text either way.
  }
}

/** ██████░░░░░░  50% */
function bar(used: number, limit: number): string {
  const cells = 16;
  const ratio = limit <= 0 ? 1 : Math.min(1, used / limit);
  const filled = Math.round(ratio * cells);
  return `${"█".repeat(filled)}${"░".repeat(cells - filled)} ${String(Math.round(ratio * 100)).padStart(3)}%`;
}

function renderPlan(p: PlanUsage): string {
  const rows: Array<[string, UsageMeter | undefined]> = [
    ["Builds", p.builds],
    ["Edits", p.edits],
    ["Projects", p.projects],
  ];
  const out = ["", `  MisarDev — ${p.planName ?? p.plan} plan (${p.subscriptionStatus})`, `  ${"─".repeat(58)}`, ""];
  for (const [label, m] of rows) {
    if (!m) continue;
    out.push(
      m.limit === null
        ? `  ${label.padEnd(9)} ${"─".repeat(16)}  Unlimited`
        : `  ${label.padEnd(9)} ${bar(m.used, m.limit)}   ${m.used} / ${m.limit}`,
    );
  }
  if (typeof p.daysRemaining === "number") out.push("", `  Resets in ${p.daysRemaining} day(s).`);
  out.push("");
  return out.join("\n");
}

export const accountTools: ToolDefinition[] = [
  defineTool({
    name: "upgrade",
    category: "account",
    description:
      "Show the current MisarDev plan, how much of each quota (builds, edits, projects) is left this period, and the link to compare plans and upgrade. Call it any time — not only after hitting a limit. Reads only: it never changes the plan or takes payment. On a local install, open=true also opens the pricing page in the user's browser.",
    scopes: ["read"],
    annotations: { title: "Plan usage and upgrade", ...READ, openWorldHint: true },
    inputSchema: {
      type: "object",
      properties: {
        open: {
          type: "boolean",
          description: "Local installs only: also open the pricing page in the browser. The hosted server returns the link instead.",
        },
      },
    },
    handler: async (ctx, a) => {
      const plan = await apiFetch<PlanUsage>(ctx, "/usage/plan");
      const sections = [renderPlan(plan), `  Compare plans and upgrade: ${PRICING_URL}\n`];
      if (a.open === true) {
        // Only a local (stdio) install runs on the user's machine; the hosted
        // server must never launch a process on its own host for a caller.
        if (ctx.source === "mcp_stdio") {
          openBrowser(PRICING_URL);
          sections.push(`  Opened ${PRICING_URL} in your browser.\n`);
        }
      }
      return sections.join("\n");
    },
  }),

  defineTool({
    name: "get_usage",
    category: "account",
    description:
      "Get detailed usage for the account. format=quick returns a lightweight summary, format=dashboard the full dashboard data; analytics=true adds a per-day breakdown over `days` (default 30). For plan limits at a glance, use upgrade.",
    scopes: ["read"],
    annotations: { title: "Get usage", ...READ },
    inputSchema: {
      type: "object",
      properties: {
        format: { type: "string", enum: ["quick", "dashboard"], description: "Response format — omit for the default summary" },
        analytics: { type: "boolean", description: "Include the detailed analytics breakdown (default false)" },
        days: { type: "number", description: "Look-back window in days (default 30)" },
      },
    },
    handler: (ctx, a) =>
      apiFetch(
        ctx,
        `/usage${buildQuery({ format: a.format, analytics: a.analytics === true ? "true" : undefined, days: a.days })}`,
      ),
  }),

  defineTool({
    name: "get_subscription",
    category: "account",
    description: "Get the account's subscription: plan, status, current period end and whether it cancels at period end.",
    scopes: ["read"],
    annotations: { title: "Get subscription", ...READ },
    inputSchema: { type: "object", properties: {} },
    handler: (ctx) => apiFetch(ctx, "/billing/subscription"),
  }),

  defineTool({
    name: "list_plans",
    category: "account",
    description: "List MisarDev's plans with prices, limits and features — what each upgrade would unlock.",
    scopes: ["read"],
    annotations: { title: "List plans", ...READ },
    inputSchema: { type: "object", properties: {} },
    handler: (ctx) => apiFetch(ctx, "/billing/plans"),
  }),

  defineTool({
    name: "list_notifications",
    category: "account",
    description:
      "List your notifications (build finished, deploy failed, invitations…), newest first, with the unread count. Pass `before` (an ISO timestamp from the last row) to page back; unread_only=true returns just the count.",
    scopes: ["read"],
    annotations: { title: "List notifications", ...READ },
    inputSchema: {
      type: "object",
      properties: {
        before: { type: "string", description: "ISO timestamp — return notifications older than this" },
        unread_only: { type: "boolean", description: "Return only { unreadCount }" },
      },
    },
    handler: (ctx, a) =>
      apiFetch(ctx, `/notifications${buildQuery({ before: a.before, count: a.unread_only === true ? "1" : undefined })}`),
  }),

  defineTool({
    name: "mark_notifications_read",
    category: "account",
    description: "Mark every notification as read, clearing the unread badge. Nothing is deleted.",
    scopes: ["write"],
    annotations: {
      title: "Mark notifications read",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: { type: "object", properties: {} },
    handler: (ctx) => apiFetch(ctx, "/notifications", json("PATCH", { action: "markAllRead" })),
  }),

  defineTool({
    name: "list_api_keys",
    category: "account",
    description: "List your API keys — name, prefix, created/expiry dates and IP allowlist. Never returns the secret.",
    scopes: ["admin"],
    annotations: { title: "List API keys", ...READ },
    inputSchema: { type: "object", properties: {} },
    handler: (ctx) => apiFetch(ctx, "/account/api-keys"),
  }),

  defineTool({
    name: "create_api_key",
    category: "account",
    description:
      "Create a new API key. The raw key is returned ONCE — hand it to the user and never repeat or store it. Every MisarDev key has full API access; keys expire (default 90 days, max 365).",
    scopes: ["admin"],
    annotations: {
      title: "Create API key",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Key label (1–80 chars)" },
        expires_in_days: { type: "number", description: "Days until expiry (1–365, default 90)" },
        ip_allowlist: {
          type: "array",
          items: { type: "string" },
          description: "Optional IPs/CIDRs allowed to use the key",
        },
      },
      required: ["name"],
    },
    handler: (ctx, a) =>
      apiFetch(
        ctx,
        "/account/api-keys",
        json("POST", { name: a.name, expiresInDays: a.expires_in_days, ipAllowlist: a.ip_allowlist }),
      ),
  }),

  defineTool({
    name: "revoke_api_key",
    category: "account",
    // The API hard-deletes the row — there is no reactivating it.
    description:
      "Revoke an API key by ID. It is deleted permanently and anything still using it fails immediately. Confirm with the user first, and never revoke the key this session is using without saying so.",
    scopes: ["admin"],
    annotations: {
      title: "Revoke API key",
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", description: "API key ID (from list_api_keys)" } },
      required: ["id"],
    },
    handler: (ctx, a) => apiFetch(ctx, `/account/api-keys/${seg(a.id)}`, json("DELETE")),
  }),

  defineTool({
    name: "mark_notification_read",
    category: "account",
    description: "Mark one notification as read (use mark_notifications_read for all of them).",
    scopes: ["write"],
    annotations: {
      title: "Mark one notification read",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", description: "Notification ID (from list_notifications)" } },
      required: ["id"],
    },
    handler: (ctx, a) => apiFetch(ctx, `/notifications/${seg(a.id)}`, json("PATCH", { read: true })),
  }),

  defineTool({
    name: "list_audit_log",
    category: "account",
    description:
      "List your own audit trail — API-key, deployment and billing events where you were the actor, newest first. Needs a plan that includes audit logs; otherwise it returns an upgrade message.",
    scopes: ["read"],
    annotations: { title: "List audit log", ...READ },
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "integer", minimum: 1, maximum: 100, description: "Default 50" },
        offset: { type: "integer", minimum: 0, description: "Default 0" },
        category: { type: "string", description: "Only events in this category" },
        action: { type: "string", description: "Only events with this action" },
      },
    },
    handler: (ctx, a) =>
      apiFetch(ctx, `/audit${buildQuery({ limit: a.limit, offset: a.offset, category: a.category, action: a.action })}`),
  }),
];
