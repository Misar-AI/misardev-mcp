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
  // Social (3.1.0) — checked 2026-11-07 against MisarDev origin/develop: each
  // handler calls getApiUser, and its prefix is in middleware API_KEY_ROUTES
  // (or PUBLIC_ROUTES for the public reads).
  ["get_feed", { limit: 10 }, "GET", "/feed?limit=10"],
  ["get_feed", { feed: "for_you", cursor: "c1" }, "GET", "/feed/for-you?cursor=c1"],
  ["list_posts", { cursor: "c1", limit: 12 }, "GET", "/posts?cursor=c1&limit=12"],
  ["get_post", { post_id: "po1" }, "GET", "/posts/po1"],
  ["list_tag_posts", { tag: "#nextjs", limit: 5 }, "GET", "/tags/nextjs?limit=5"],
  ["like_post", { post_id: "po1" }, "POST", "/posts/po1/like", {}],
  ["unlike_post", { post_id: "po1" }, "DELETE", "/posts/po1/like"],
  ["save_post", { post_id: "po1", collection_id: "co1" }, "POST", "/posts/po1/save", { collectionId: "co1" }],
  ["unsave_post", { post_id: "po1" }, "DELETE", "/posts/po1/save"],
  ["list_post_comments", { post_id: "po1", parent_id: "cm1", limit: 10 }, "GET", "/posts/po1/comments?limit=10&parentId=cm1"],
  ["create_comment", { post_id: "po1", body: "Nice!", parent_id: "cm1" }, "POST", "/posts/po1/comments", { body: "Nice!", parentId: "cm1" }],
  ["delete_comment", { comment_id: "cm1" }, "DELETE", "/comments/cm1"],
  ["follow_user", { handle: "@Ada" }, "POST", "/follow/Ada", {}],
  ["unfollow_user", { handle: "ada" }, "DELETE", "/follow/ada"],
  ["list_people_suggestions", { limit: 5 }, "GET", "/social/suggestions?limit=5"],
  ["mute_user", { handle: "ada", mute_stories: false }, "POST", "/mutes/ada", { muteStories: false }],
  ["unmute_user", { handle: "ada" }, "DELETE", "/mutes/ada"],
  ["list_dm_threads", { box: "requests", limit: 20 }, "GET", "/dm/threads?box=requests&limit=20"],
  ["list_dm_messages", { thread_id: "th1", cursor: "c1" }, "GET", "/dm/threads/th1/messages?cursor=c1"],
  ["send_direct_message", { thread_id: "th1", body: "hi" }, "POST", "/dm/threads/th1/messages", { body: "hi" }],
  ["send_direct_message", { handle: "ada", body: "hi" }, "POST", "/dm/threads", { handle: "ada", body: "hi" }],
  ["mark_dm_thread_read", { thread_id: "th1" }, "POST", "/dm/threads/th1/read", {}],
  ["accept_dm_request", { thread_id: "th1" }, "POST", "/dm/threads/th1/accept", {}],
  ["get_dm_unread_counts", {}, "GET", "/dm/unread"],
  // Wave 6 follow-ups: /api/me/saved joined API_KEY_ROUTES; DM thread mute is new.
  ["list_saved_posts", { collection_id: "co1", cursor: "c1", limit: 10 }, "GET", "/me/saved?collection=co1&cursor=c1&limit=10"],
  ["mute_dm_thread", { thread_id: "th1" }, "POST", "/dm/threads/th1/mute", {}],
  ["unmute_dm_thread", { thread_id: "th1" }, "DELETE", "/dm/threads/th1/mute"],
  ["get_story_tray", {}, "GET", "/stories/tray"],
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
