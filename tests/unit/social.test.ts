/**
 * The social tool group (3.1.0): behaviour the route map in routes.test.ts
 * does not pin down — annotations on the outward-facing writes, argument
 * normalisation, optional bodies, and error pass-through.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { ALL_TOOLS, dispatch, resolveTool } from "../../src/registry.js";
import { socialTools } from "../../src/tools/social.js";
import { httpContext } from "../../src/lib/context.js";

const BASE = "https://example.invalid";
const ctx = httpContext("mdk_test", BASE);

afterEach(() => vi.restoreAllMocks());

function mockOk(body: unknown = { ok: true }, status = 200) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(body), { status }));
}

function call(fetchMock: ReturnType<typeof mockOk>, i = 0) {
  const [url, init] = fetchMock.mock.calls[i]! as [string, RequestInit];
  return { url, method: (init.method ?? "GET").toUpperCase(), body: init.body === undefined ? undefined : JSON.parse(String(init.body)) };
}

const READS = [
  "get_feed",
  "list_posts",
  "get_post",
  "list_tag_posts",
  "list_post_comments",
  "list_people_suggestions",
  "list_dm_threads",
  "list_dm_messages",
  "get_dm_unread_counts",
  "get_story_tray",
  "list_saved_posts",
];

describe("social catalogue", () => {
  it("registers 26 tools, all in the social category and in ALL_TOOLS", () => {
    expect(socialTools).toHaveLength(26);
    const all = new Set(ALL_TOOLS.map((t) => t.name));
    for (const t of socialTools) {
      expect(t.category, t.name).toBe("social");
      expect(all.has(t.name), t.name).toBe(true);
    }
  });

  it("marks exactly the reads read-only, and every other social tool as a write", () => {
    for (const t of socialTools) {
      if (READS.includes(t.name)) {
        expect(t.annotations.readOnlyHint, t.name).toBe(true);
        expect(t.scopes, t.name).toEqual(["read"]);
      } else {
        expect(t.annotations.readOnlyHint, t.name).toBe(false);
        expect(t.scopes, t.name).toEqual(["write"]);
      }
    }
  });

  it("flags sending a DM and commenting as outward-facing, non-idempotent actions to confirm", () => {
    for (const name of ["send_direct_message", "create_comment"]) {
      const t = resolveTool(name)!;
      expect(t.annotations.readOnlyHint, name).toBe(false);
      expect(t.annotations.idempotentHint, name).toBe(false);
      expect(t.description, name).toMatch(/go-ahead/);
    }
    expect(resolveTool("send_direct_message")!.description).toMatch(/cannot be unsent/);
  });

  it("marks delete_comment destructive and the reversible toggles not", () => {
    expect(resolveTool("delete_comment")!.annotations.destructiveHint).toBe(true);
    for (const name of ["unlike_post", "unsave_post", "unfollow_user", "unmute_user", "mute_user", "mute_dm_thread", "unmute_dm_thread"]) {
      expect(resolveTool(name)!.annotations.destructiveHint, name).toBe(false);
      expect(resolveTool(name)!.annotations.idempotentHint, name).toBe(true);
    }
  });

  it("lists saved posts read-only, with no collection filter by default", async () => {
    expect(resolveTool("list_saved_posts")!.annotations.readOnlyHint).toBe(true);
    const f = mockOk({ items: [], nextCursor: null });
    await dispatch("list_saved_posts", {}, ctx);
    expect(call(f)).toMatchObject({ url: `${BASE}/me/saved`, method: "GET" });
  });
});

describe("social arguments", () => {
  it("strips a leading @ from handles and still encodes the segment", async () => {
    const f = mockOk();
    await dispatch("follow_user", { handle: "  @ada " }, ctx);
    await dispatch("mute_user", { handle: "@../account" }, ctx);
    expect(call(f, 0).url).toBe(`${BASE}/follow/ada`);
    expect(call(f, 1).url).toBe(`${BASE}/mutes/..%2Faccount`);
  });

  it("strips a leading # from tags and URL-encodes any script", async () => {
    const f = mockOk();
    await dispatch("list_tag_posts", { tag: "#café" }, ctx);
    expect(call(f).url).toBe(`${BASE}/tags/caf%C3%A9`);
  });

  it("sends an empty body for save_post and mute_user when no options are given", async () => {
    const f = mockOk();
    await dispatch("save_post", { post_id: "p1" }, ctx);
    await dispatch("mute_user", { handle: "ada" }, ctx);
    expect(call(f, 0)).toMatchObject({ method: "POST", body: {} });
    expect(call(f, 1)).toMatchObject({ method: "POST", body: {} });
  });

  it("omits parentId on a top-level comment", async () => {
    const f = mockOk({ comment: {} }, 201);
    await dispatch("create_comment", { post_id: "p1", body: "Great build" }, ctx);
    expect(call(f).body).toEqual({ body: "Great build" });
  });

  it("defaults get_feed to the following feed", async () => {
    const f = mockOk({ items: [], nextCursor: null });
    await dispatch("get_feed", {}, ctx);
    expect(call(f).url).toBe(`${BASE}/feed`);
  });

  it("starts a conversation by handle when thread_id is empty", async () => {
    const f = mockOk({ threadId: "t1", messageId: "m1", accepted: true }, 201);
    await dispatch("send_direct_message", { thread_id: "", handle: "ada", body: "hey" }, ctx);
    expect(call(f)).toEqual({ url: `${BASE}/dm/threads`, method: "POST", body: { handle: "ada", body: "hey" } });
  });

  it("returns the API's body unchanged", async () => {
    mockOk({ following: true, followers: 12 });
    await expect(dispatch("follow_user", { handle: "ada" }, ctx)).resolves.toEqual({ following: true, followers: 12 });
  });
});

describe("social errors", () => {
  it("surfaces the API's own 404 for a hidden post", async () => {
    mockOk({ error: "Post not found" }, 404);
    await expect(dispatch("like_post", { post_id: "p1" }, ctx)).rejects.toThrow("Post not found");
  });

  it("surfaces the same 404 for a DM thread you are not in when muting", async () => {
    mockOk({ error: "Conversation not found" }, 404);
    await expect(dispatch("mute_dm_thread", { thread_id: "t1" }, ctx)).rejects.toThrow("Conversation not found");
  });

  it("returns { muted } from mute_dm_thread unchanged", async () => {
    mockOk({ muted: true });
    await expect(dispatch("mute_dm_thread", { thread_id: "t1" }, ctx)).resolves.toEqual({ muted: true });
  });

  it("surfaces the DM rate-limit message", async () => {
    mockOk({ error: "You're sending messages fast. Take a breath and try again." }, 429);
    await expect(dispatch("send_direct_message", { handle: "ada", body: "hi" }, ctx)).rejects.toThrow(
      /sending messages fast/,
    );
  });

  it("surfaces comments-off as the API's 403 message", async () => {
    mockOk({ error: "Comments are turned off for this post." }, 403);
    await expect(dispatch("create_comment", { post_id: "p1", body: "x" }, ctx)).rejects.toThrow(/turned off/);
  });
});
