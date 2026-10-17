/**
 * Every tool → the exact MisarDev route it calls.
 *
 * Unit tests passed while three MisarMail tools pointed at routes that did not
 * exist; this table is the cheap half of preventing that here. Each row was
 * checked against MisarDev's apps/web/src/app/api/** (and app/v1/**) handlers:
 * method, path and the field names the handler actually reads (re-checked
 * 2026-10-16 against origin/feature/public-api-sdks-mcp: every route exists and
 * accepts an `mdk_` key). The expensive
 * half — a live call with a real key — is still required before publishing.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { ALL_TOOLS, dispatch } from "../../src/registry.js";
import { httpContext } from "../../src/lib/context.js";

const BASE = "https://example.invalid";
const ctx = httpContext("mdk_test", BASE);

type Row = [tool: string, args: Record<string, unknown>, method: string, path: string, body?: Record<string, unknown>];

export const ROUTES: Row[] = [
  ["list_projects", { limit: 5, view: "trash" }, "GET", "/projects?limit=5&view=trash"],
  ["get_project", { id: "p1" }, "GET", "/projects/p1"],
  ["create_project", { name: "A", description: "d" }, "POST", "/projects", { name: "A", description: "d" }],
  ["update_project", { id: "p1", is_public: false, version: 3 }, "PATCH", "/projects/p1", { is_public: false, version: 3 }],
  ["delete_project", { id: "p1" }, "DELETE", "/projects/p1"],
  ["restore_project", { id: "p1" }, "POST", "/projects/p1", {}],
  ["archive_project", { id: "p1", archived: true }, "POST", "/projects/p1/archive", { archived: true }],
  ["duplicate_project", { id: "p1" }, "POST", "/projects/p1/duplicate", {}],
  ["get_project_files", { id: "p1" }, "GET", "/projects/p1/files"],
  ["list_templates", {}, "GET", "/templates"],
  ["get_template", { id: "t1" }, "GET", "/templates/t1"],
  ["use_template", { id: "t1", name: "New" }, "POST", "/templates/t1/use", { projectName: "New" }],
  ["deploy_project", { id: "p1", subdomain: "app" }, "POST", "/projects/p1/deploy", { subdomain: "app" }],
  ["get_deployment_status", { id: "p1" }, "GET", "/projects/p1/deploy"],
  ["unpublish_project", { id: "p1" }, "DELETE", "/projects/p1/deploy"],
  ["check_subdomain", { id: "p1", subdomain: "app" }, "GET", "/projects/p1/subdomain/check?value=app"],
  ["list_builds", { limit: 10 }, "GET", "/builds?limit=10"],
  ["get_build_status", { id: "p1" }, "GET", "/projects/p1/build-status"],
  ["cancel_build", { id: "p1" }, "POST", "/projects/p1/cancel-build", {}],
  ["list_checkpoints", { id: "p1" }, "GET", "/projects/p1/checkpoints"],
  ["restore_checkpoint", { checkpoint_id: "c1" }, "POST", "/checkpoints/c1/restore", {}],
  ["rename_checkpoint", { checkpoint_id: "c1", label: "before refactor" }, "PATCH", "/checkpoints/c1", { label: "before refactor" }],
  ["get_custom_domain", { id: "p1" }, "GET", "/projects/p1/domain"],
  ["set_custom_domain", { id: "p1", domain: "app.example.com" }, "POST", "/projects/p1/domain", { domain: "app.example.com" }],
  ["remove_custom_domain", { id: "p1" }, "DELETE", "/projects/p1/domain"],
  ["lookup_domain", { domain: "example.com" }, "GET", "/domains/lookup?domain=example.com"],
  ["search_workspace", { query: "invoice", types: "project" }, "GET", "/search?q=invoice&types=project"],
  ["web_search", { query: "q" }, "POST", "/v1/search", { query: "q" }],
  [
    "create_chat_completion",
    { messages: [{ role: "user", content: "hi" }] },
    "POST",
    "/v1/chat/completions",
    { messages: [{ role: "user", content: "hi" }], stream: false },
  ],
  ["index_project_code", { project_id: "p1", files: { "a.ts": "x" } }, "POST", "/rag", { projectId: "p1", files: { "a.ts": "x" } }],
  ["search_project_code", { project_id: "p1", query: "auth" }, "GET", "/rag?projectId=p1&query=auth"],
  ["get_code_index_stats", { project_id: "p1" }, "GET", "/rag?projectId=p1&stats=true"],
  ["clear_code_index", { project_id: "p1" }, "DELETE", "/rag?projectId=p1"],
  ["get_usage", { format: "quick", analytics: true, days: 7 }, "GET", "/usage?format=quick&analytics=true&days=7"],
  ["get_subscription", {}, "GET", "/billing/subscription"],
  ["list_plans", {}, "GET", "/billing/plans"],
  ["list_notifications", { unread_only: true }, "GET", "/notifications?count=1"],
  ["mark_notifications_read", {}, "PATCH", "/notifications", { action: "markAllRead" }],
  ["list_api_keys", {}, "GET", "/account/api-keys"],
  ["create_api_key", { name: "ci", expires_in_days: 30 }, "POST", "/account/api-keys", { name: "ci", expiresInDays: 30 }],
  ["revoke_api_key", { id: "k1" }, "DELETE", "/account/api-keys/k1"],
  ["list_connectors", {}, "GET", "/connectors"],
  ["toggle_connector", { slug: "github", enabled: true }, "POST", "/connectors/github/toggle", { enabled: true }],
  [
    "write_project_files",
    { id: "p1", files: [{ path: "src/a.ts", content: "x", action: "create" }], version: 4 },
    "POST",
    "/projects/p1/files",
    { files: [{ path: "src/a.ts", content: "x", action: "create" }], version: 4 },
  ],
  ["import_artifact", { id: "p1", url: "https://misar.ai/code/artifact/u1" }, "POST", "/projects/p1/import-artifact", { url: "https://misar.ai/code/artifact/u1" }],
  ["get_project_knowledge", { id: "p1" }, "GET", "/projects/p1/knowledge"],
  ["update_project_knowledge", { id: "p1", content: "Use Tailwind." }, "PUT", "/projects/p1/knowledge", { content: "Use Tailwind." }],
  ["get_project_backend", { id: "p1" }, "GET", "/projects/p1/backend"],
  ["provision_project_backend", { id: "p1" }, "POST", "/projects/p1/backend", { action: "provision" }],
  ["update_project_subdomain", { id: "p1", subdomain: "my-app" }, "PATCH", "/projects/p1/subdomain", { subdomain: "my-app" }],
  ["delete_checkpoint", { checkpoint_id: "c1" }, "DELETE", "/checkpoints/c1"],
  ["mark_notification_read", { id: "n1" }, "PATCH", "/notifications/n1", { read: true }],
  ["list_audit_log", { limit: 10, category: "deploy" }, "GET", "/audit?limit=10&category=deploy"],
];

afterEach(() => vi.restoreAllMocks());

describe("route map", () => {
  it("covers every tool except `upgrade` (asserted separately)", () => {
    const mapped = new Set(ROUTES.map((r) => r[0]));
    const unmapped = ALL_TOOLS.map((t) => t.name).filter((n) => !mapped.has(n) && n !== "upgrade");
    expect(unmapped).toEqual([]);
  });

  it.each(ROUTES)("%s → %s %s", async (tool, args, method, path, body) => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    await dispatch(tool, args, ctx);
    const [url, init] = fetchMock.mock.calls[0]! as [string, RequestInit];
    expect(url).toBe(`${BASE}${path}`);
    expect((init.method ?? "GET").toUpperCase()).toBe(method);
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer mdk_test");
    if (body) expect(JSON.parse(String(init.body))).toEqual(body);
  });

  it("encodes ids so they cannot escape their path segment", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("{}", { status: 200 }));
    await dispatch("get_project", { id: "../account/api-keys" }, ctx);
    expect(String(fetchMock.mock.calls[0]![0])).toBe(`${BASE}/projects/..%2Faccount%2Fapi-keys`);
  });

  it("upgrade reads /usage/plan and links to the pricing page without opening a browser on HTTP", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          plan: "free",
          planName: "Free",
          subscriptionStatus: "active",
          builds: { used: 12, limit: 15, remaining: 3 },
          edits: { used: 1, limit: null, remaining: null },
          projects: { used: 2, limit: 3, remaining: 1 },
          periodEnd: "2026-11-01",
          daysRemaining: 15,
        }),
        { status: 200 },
      ),
    );
    const out = String(await dispatch("upgrade", { open: true }, ctx));
    expect(String(fetchMock.mock.calls[0]![0])).toBe(`${BASE}/usage/plan`);
    expect(out).toContain("Free plan");
    expect(out).toContain("12 / 15");
    expect(out).toContain("https://misar.dev/pricing");
    expect(out).not.toContain("Opened");
  });
});
