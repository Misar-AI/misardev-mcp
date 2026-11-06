import { apiFetch, buildQuery, json, seg } from "../lib/api-client.js";
import { defineTool, READ, type ToolAnnotations, type ToolDefinition } from "../lib/types.js";

/*
 * MisarDev's social layer: feed, posts, comments, follows, mutes, DMs and
 * stories. Every route below was read in MisarDev apps/web/src/app/api/** and
 * authenticates an `mdk_` key through getApiUser (the reads under /api/posts,
 * /api/tags and /api/feed/for-you are public and only use the key to
 * personalise). The actor is ALWAYS the key's owner — the API never takes a
 * user id from the request. A post, comment, thread or profile you cannot see
 * answers the same 404 as a missing one, by design.
 */

/** Annotations for a reversible social toggle (like, save, follow, mute, read, thread mute). */
const TOGGLE: Omit<ToolAnnotations, "title"> = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

const POST_ID = { post_id: { type: "string", description: "Post UUID (from get_feed, list_posts or list_tag_posts)" } } as const;
const THREAD_ID = { thread_id: { type: "string", description: "Conversation UUID (from list_dm_threads)" } } as const;
const HANDLE = { handle: { type: "string", description: "The builder's handle, with or without the leading @" } } as const;
const CURSOR = {
  cursor: { type: "string", description: "Opaque cursor: the previous page's nextCursor" },
} as const;
const PAGE = {
  ...CURSOR,
  limit: { type: "integer", minimum: 1, maximum: 48, description: "Results per page (default 24, max 48)" },
} as const;

/** Handles and tags are path segments; accept the `@` / `#` people type. */
const handleSeg = (v: unknown) => seg(String(v ?? "").trim().replace(/^@/, ""));
const tagSeg = (v: unknown) => seg(String(v ?? "").trim().replace(/^#/, ""));

export const socialTools: ToolDefinition[] = [
  // ── Feed and posts ──────────────────────────────────────────────────────
  defineTool({
    name: "get_feed",
    category: "social",
    description:
      "Read your home feed, one keyset page at a time. feed=following (default) is posts by the builders you follow plus your own, newest first; feed=for_you is the ranked discovery feed. Blocked, muted and hidden authors are left out. Pass the returned nextCursor to get the next page.",
    scopes: ["read"],
    annotations: { title: "Get feed", ...READ },
    inputSchema: {
      type: "object",
      properties: {
        feed: {
          type: "string",
          enum: ["following", "for_you"],
          description: "Which feed to read (default following)",
        },
        ...PAGE,
      },
    },
    handler: (ctx, a) =>
      apiFetch(
        ctx,
        `${a.feed === "for_you" ? "/feed/for-you" : "/feed"}${buildQuery({ cursor: a.cursor, limit: a.limit })}`,
      ),
  }),

  defineTool({
    name: "list_posts",
    category: "social",
    description:
      "List the public explore grid: every publicly listed post, newest first, with cursor pagination. Each post links the project or template it shares.",
    scopes: ["read"],
    annotations: { title: "List posts", ...READ },
    inputSchema: { type: "object", properties: { ...PAGE } },
    handler: (ctx, a) => apiFetch(ctx, `/posts${buildQuery({ cursor: a.cursor, limit: a.limit })}`),
  }),

  defineTool({
    name: "get_post",
    category: "social",
    description:
      "Get one public post by ID: caption, author, the project or template it shares, its live URL, and its like, comment and remix counts. A hidden or removed post is the same 404 as a missing one.",
    scopes: ["read"],
    annotations: { title: "Get post", ...READ },
    inputSchema: { type: "object", properties: { ...POST_ID }, required: ["post_id"] },
    handler: (ctx, a) => apiFetch(ctx, `/posts/${seg(a.post_id)}`),
  }),

  defineTool({
    name: "list_tag_posts",
    category: "social",
    description:
      "List the posts carrying a hashtag, newest first, with cursor pagination. An unknown tag, or one with no visible posts, is a 404.",
    scopes: ["read"],
    annotations: { title: "List posts by hashtag", ...READ },
    inputSchema: {
      type: "object",
      properties: {
        tag: { type: "string", description: "The hashtag, with or without the leading #" },
        ...PAGE,
      },
      required: ["tag"],
    },
    handler: (ctx, a) => apiFetch(ctx, `/tags/${tagSeg(a.tag)}${buildQuery({ cursor: a.cursor, limit: a.limit })}`),
  }),

  defineTool({
    name: "like_post",
    category: "social",
    description:
      "Like a post as yourself. Idempotent: liking an already-liked post changes nothing. Returns the new like state and count (the count is null when the author hides it).",
    scopes: ["write"],
    annotations: { title: "Like post", ...TOGGLE },
    inputSchema: { type: "object", properties: { ...POST_ID }, required: ["post_id"] },
    handler: (ctx, a) => apiFetch(ctx, `/posts/${seg(a.post_id)}/like`, json("POST", {})),
  }),

  defineTool({
    name: "unlike_post",
    category: "social",
    description: "Remove your like from a post. Idempotent: a post you have not liked stays unliked. Returns the new like state and count.",
    scopes: ["write"],
    annotations: { title: "Unlike post", ...TOGGLE },
    inputSchema: { type: "object", properties: { ...POST_ID }, required: ["post_id"] },
    handler: (ctx, a) => apiFetch(ctx, `/posts/${seg(a.post_id)}/like`, json("DELETE")),
  }),

  defineTool({
    name: "save_post",
    category: "social",
    description:
      "Save (bookmark) a post, optionally into one of your collections. Saves are private to you. Idempotent. A collection that is not yours is a 404.",
    scopes: ["write"],
    annotations: { title: "Save post", ...TOGGLE },
    inputSchema: {
      type: "object",
      properties: {
        ...POST_ID,
        collection_id: { type: "string", description: "Optional: UUID of one of your collections to save it into" },
      },
      required: ["post_id"],
    },
    handler: (ctx, a) =>
      apiFetch(
        ctx,
        `/posts/${seg(a.post_id)}/save`,
        json("POST", a.collection_id === undefined ? {} : { collectionId: a.collection_id }),
      ),
  }),

  defineTool({
    name: "unsave_post",
    category: "social",
    description: "Unsave a post. It is also taken out of every collection you had put it in. Idempotent.",
    scopes: ["write"],
    annotations: { title: "Unsave post", ...TOGGLE },
    inputSchema: { type: "object", properties: { ...POST_ID }, required: ["post_id"] },
    handler: (ctx, a) => apiFetch(ctx, `/posts/${seg(a.post_id)}/save`, json("DELETE")),
  }),

  defineTool({
    name: "list_saved_posts",
    category: "social",
    description:
      "List the posts you saved, newest save first, with cursor pagination. Saves are private to you. Pass collection_id to list one of your collections; anyone else's collection is a 404. Posts that have since gone private, hidden or removed are left out.",
    scopes: ["read"],
    annotations: { title: "List saved posts", ...READ },
    inputSchema: {
      type: "object",
      properties: {
        collection_id: { type: "string", description: "Optional: UUID of one of your collections" },
        ...PAGE,
      },
    },
    handler: (ctx, a) =>
      apiFetch(ctx, `/me/saved${buildQuery({ collection: a.collection_id, cursor: a.cursor, limit: a.limit })}`),
  }),

  defineTool({
    name: "list_post_comments",
    category: "social",
    description:
      "List a post's comments: top-level comments newest first, each with its first replies. Pass parent_id to page through one comment's replies (oldest first). Use the returned nextCursor for the next page.",
    scopes: ["read"],
    annotations: { title: "List post comments", ...READ },
    inputSchema: {
      type: "object",
      properties: {
        ...POST_ID,
        parent_id: { type: "string", description: "Optional: a top-level comment UUID, to list its replies" },
        ...PAGE,
      },
      required: ["post_id"],
    },
    handler: (ctx, a) =>
      apiFetch(
        ctx,
        `/posts/${seg(a.post_id)}/comments${buildQuery({ cursor: a.cursor, limit: a.limit, parentId: a.parent_id })}`,
      ),
  }),

  defineTool({
    name: "create_comment",
    category: "social",
    description:
      "Post a public comment on a post, or a reply to a top-level comment, under the user's own name. Other people see it, and anyone @mentioned is notified, so show the user the exact text and get their go-ahead first. Plain text, 1–2,200 characters; replies go one level deep. Fails with 403 when the author turned comments off.",
    scopes: ["write"],
    annotations: {
      title: "Create comment",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      properties: {
        ...POST_ID,
        body: { type: "string", description: "Comment text (1–2,200 characters)" },
        parent_id: { type: "string", description: "Optional: the top-level comment UUID to reply to" },
      },
      required: ["post_id", "body"],
    },
    handler: (ctx, a) => {
      const body: Record<string, unknown> = { body: a.body };
      if (a.parent_id !== undefined) body.parentId = a.parent_id;
      return apiFetch(ctx, `/posts/${seg(a.post_id)}/comments`, json("POST", body));
    },
  }),

  defineTool({
    name: "delete_comment",
    category: "social",
    description:
      "Delete a comment you wrote, or one on your own post. Deleting a top-level comment also removes its replies, and it cannot be undone through the API. Confirm with the user first.",
    scopes: ["write"],
    annotations: {
      title: "Delete comment",
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      properties: { comment_id: { type: "string", description: "Comment UUID (from list_post_comments)" } },
      required: ["comment_id"],
    },
    handler: (ctx, a) => apiFetch(ctx, `/comments/${seg(a.comment_id)}`, json("DELETE")),
  }),

  // ── Social graph ────────────────────────────────────────────────────────
  defineTool({
    name: "follow_user",
    category: "social",
    description:
      "Follow a builder by handle, so their posts join your following feed. Idempotent. An unknown or hidden handle is a 404; following yourself is a 400. Returns the new follower count.",
    scopes: ["write"],
    annotations: { title: "Follow user", ...TOGGLE },
    inputSchema: { type: "object", properties: { ...HANDLE }, required: ["handle"] },
    handler: (ctx, a) => apiFetch(ctx, `/follow/${handleSeg(a.handle)}`, json("POST", {})),
  }),

  defineTool({
    name: "unfollow_user",
    category: "social",
    description: "Stop following a builder by handle. Idempotent. Returns the new follower count.",
    scopes: ["write"],
    annotations: { title: "Unfollow user", ...TOGGLE },
    inputSchema: { type: "object", properties: { ...HANDLE }, required: ["handle"] },
    handler: (ctx, a) => apiFetch(ctx, `/follow/${handleSeg(a.handle)}`, json("DELETE")),
  }),

  defineTool({
    name: "list_people_suggestions",
    category: "social",
    description:
      "Suggest builders you may want to follow, each with a ready-to-show reason (for example \"Follows you\" or \"Followed by 3 people you follow\"). Blocked, dismissed, private and non-discoverable accounts are left out.",
    scopes: ["read"],
    annotations: { title: "List people suggestions", ...READ },
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "integer", minimum: 1, maximum: 50, description: "How many people (default 20, max 50)" },
      },
    },
    handler: (ctx, a) => apiFetch(ctx, `/social/suggestions${buildQuery({ limit: a.limit })}`),
  }),

  defineTool({
    name: "mute_user",
    category: "social",
    description:
      "Mute a builder's posts, stories or both (default both). Silent: they are not told and nothing changes for them; it only filters what you see. Idempotent. Muting yourself is a 400.",
    scopes: ["write"],
    annotations: { title: "Mute user", ...TOGGLE },
    inputSchema: {
      type: "object",
      properties: {
        ...HANDLE,
        mute_posts: { type: "boolean", description: "Hide their posts from your feeds (default true)" },
        mute_stories: { type: "boolean", description: "Hide their stories from your tray (default true)" },
      },
      required: ["handle"],
    },
    handler: (ctx, a) => {
      const body: Record<string, unknown> = {};
      if (a.mute_posts !== undefined) body.mutePosts = a.mute_posts;
      if (a.mute_stories !== undefined) body.muteStories = a.mute_stories;
      return apiFetch(ctx, `/mutes/${handleSeg(a.handle)}`, json("POST", body));
    },
  }),

  defineTool({
    name: "unmute_user",
    category: "social",
    description: "Unmute a builder, so their posts and stories show again. Idempotent.",
    scopes: ["write"],
    annotations: { title: "Unmute user", ...TOGGLE },
    inputSchema: { type: "object", properties: { ...HANDLE }, required: ["handle"] },
    handler: (ctx, a) => apiFetch(ctx, `/mutes/${handleSeg(a.handle)}`, json("DELETE")),
  }),

  // ── Direct messages ─────────────────────────────────────────────────────
  defineTool({
    name: "list_dm_threads",
    category: "social",
    description:
      "List your direct-message conversations, newest activity first. box=inbox (default) is your inbox; box=requests is message requests from people you don't follow, each with mutualCount for a safety check. Use the returned nextCursor for the next page.",
    scopes: ["read"],
    annotations: { title: "List DM threads", ...READ },
    inputSchema: {
      type: "object",
      properties: {
        box: { type: "string", enum: ["inbox", "requests"], description: "Which box to list (default inbox)" },
        ...PAGE,
      },
    },
    handler: (ctx, a) =>
      apiFetch(ctx, `/dm/threads${buildQuery({ box: a.box, cursor: a.cursor, limit: a.limit })}`),
  }),

  defineTool({
    name: "list_dm_messages",
    category: "social",
    description:
      "Read one conversation, newest message first, with cursor pagination. Also returns the other person, whether it is still a request for you, and when they last read it. Reading does not mark it read; use mark_dm_thread_read for that.",
    scopes: ["read"],
    annotations: { title: "List DM messages", ...READ },
    inputSchema: {
      type: "object",
      properties: {
        ...THREAD_ID,
        ...CURSOR,
        limit: { type: "integer", minimum: 1, maximum: 60, description: "Messages per page (max 60)" },
      },
      required: ["thread_id"],
    },
    handler: (ctx, a) =>
      apiFetch(ctx, `/dm/threads/${seg(a.thread_id)}/messages${buildQuery({ cursor: a.cursor, limit: a.limit })}`),
  }),

  defineTool({
    name: "send_direct_message",
    category: "social",
    description:
      "Send a direct message, as the user, to another person. It is delivered to them immediately and cannot be unsent, so show the user the exact text and recipient and get their explicit go-ahead before calling this. Pass thread_id to reply in an existing conversation (replying to a request accepts it), or handle to message someone, starting the conversation if there is none. Plain text, 1–2,000 characters. Starting more than 20 new conversations in 24 hours is refused.",
    scopes: ["write"],
    annotations: {
      title: "Send direct message",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      properties: {
        body: { type: "string", description: "Message text (1–2,000 characters)" },
        ...THREAD_ID,
        handle: { type: "string", description: "Recipient's handle, used when there is no thread_id" },
      },
      required: ["body"],
    },
    handler: (ctx, a) =>
      a.thread_id !== undefined && a.thread_id !== ""
        ? apiFetch(ctx, `/dm/threads/${seg(a.thread_id)}/messages`, json("POST", { body: a.body }))
        : apiFetch(ctx, "/dm/threads", json("POST", { handle: a.handle, body: a.body })),
  }),

  defineTool({
    name: "mark_dm_thread_read",
    category: "social",
    description:
      "Mark a conversation read up to now. The other person can then see it as \"Seen\". Idempotent.",
    scopes: ["write"],
    annotations: { title: "Mark DM thread read", ...TOGGLE },
    inputSchema: { type: "object", properties: { ...THREAD_ID }, required: ["thread_id"] },
    handler: (ctx, a) => apiFetch(ctx, `/dm/threads/${seg(a.thread_id)}/read`, json("POST", {})),
  }),

  defineTool({
    name: "accept_dm_request",
    category: "social",
    description:
      "Accept a message request, moving the conversation into your inbox. Idempotent.",
    scopes: ["write"],
    annotations: { title: "Accept DM request", ...TOGGLE },
    inputSchema: { type: "object", properties: { ...THREAD_ID }, required: ["thread_id"] },
    handler: (ctx, a) => apiFetch(ctx, `/dm/threads/${seg(a.thread_id)}/accept`, json("POST", {})),
  }),

  defineTool({
    name: "mute_dm_thread",
    category: "social",
    description:
      "Mute a conversation for yourself. It still receives messages and stays in your inbox, but no longer counts toward the unread badge or sends request notifications. The other person is not told. Idempotent; undo with unmute_dm_thread.",
    scopes: ["write"],
    annotations: { title: "Mute DM thread", ...TOGGLE },
    inputSchema: { type: "object", properties: { ...THREAD_ID }, required: ["thread_id"] },
    handler: (ctx, a) => apiFetch(ctx, `/dm/threads/${seg(a.thread_id)}/mute`, json("POST", {})),
  }),

  defineTool({
    name: "unmute_dm_thread",
    category: "social",
    description: "Unmute a conversation, so it counts toward your unread badge again. Idempotent.",
    scopes: ["write"],
    annotations: { title: "Unmute DM thread", ...TOGGLE },
    inputSchema: { type: "object", properties: { ...THREAD_ID }, required: ["thread_id"] },
    handler: (ctx, a) => apiFetch(ctx, `/dm/threads/${seg(a.thread_id)}/mute`, json("DELETE")),
  }),

  defineTool({
    name: "get_dm_unread_counts",
    category: "social",
    description:
      "Count your unread conversations and pending message requests: the numbers behind the inbox badge.",
    scopes: ["read"],
    annotations: { title: "Get DM unread counts", ...READ },
    inputSchema: { type: "object", properties: {} },
    handler: (ctx) => apiFetch(ctx, "/dm/unread"),
  }),

  // ── Stories ─────────────────────────────────────────────────────────────
  defineTool({
    name: "get_story_tray",
    category: "social",
    description:
      "Get the story tray: your own ring first, then the builders you follow who have a live story you may see, unseen ones first. Blocked and story-muted people are left out.",
    scopes: ["read"],
    annotations: { title: "Get story tray", ...READ },
    inputSchema: { type: "object", properties: {} },
    handler: (ctx) => apiFetch(ctx, "/stories/tray"),
  }),
];
