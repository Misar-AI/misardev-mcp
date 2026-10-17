/**
 * The authentication contract every Misar MCP server must satisfy.
 *
 * Three rules, and all three have been violated in production on a sibling
 * product (see docs/Guidelines/MCP_SERVER_PROTOCOL.md):
 *
 *  1. Discovery NEVER requires credentials — a server that refuses (or exits)
 *     without a key never gets catalogued, which is why MisarMail's Smithery
 *     listing froze at a stale 16-tool snapshot.
 *  2. Execution ALWAYS requires credentials, with the RFC 9728 challenge.
 *  3. The refusal must be ACTIONABLE — MCP clients relay it verbatim, so it IS
 *     the authentication UX.
 *
 * MisarDev ships no browser sign-in (no /authorize page, no `login` tool), so
 * rule 3 is checked against the manual-key path, and the guidance must NOT send
 * the user to a login that does not exist.
 */
import { describe, it, expect } from "vitest";
import { createHttpHandler } from "../../src/http.js";
import { listTools } from "../../src/registry.js";
import {
  authGuidance,
  AUTH_URLS,
  ENV_KEY,
  KEY_PREFIX,
  CONFIG_PATH,
  HAS_BROWSER_LOGIN,
} from "../../src/lib/auth-guidance.js";

const VALID = "Bearer mdk_good";

const handler = createHttpHandler({
  baseUrl: "https://example.invalid",
  authenticate: async (h) => (h === VALID ? { userId: "u1" } : null),
});

function post(body: unknown, headers: Record<string, string> = {}) {
  return handler(
    new Request("https://api.misar.io/dev/mcp", {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
    }),
  );
}

const CALL = { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "list_projects", arguments: {} } };

describe("rule 1 — discovery never requires credentials", () => {
  it.each(["initialize", "tools/list", "prompts/list", "resources/list"])(
    "%s answers unauthenticated",
    async (method) => {
      const res = await post({ jsonrpc: "2.0", id: 1, method, params: {} });
      expect(res.status).toBe(200);
    },
  );

  it("advertises the full catalogue to an unauthenticated scanner", async () => {
    const res = await post({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} });
    const body = await res.json();
    expect(body.result.tools).toHaveLength(listTools().length);
  });

  it("reports the package version on initialize", async () => {
    const res = await post({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} });
    const body = await res.json();
    expect(body.result.serverInfo.name).toBe("misardev");
    expect(body.result.serverInfo.version).toMatch(/^\d+\.\d+\.\d+/);
  });
});

describe("rule 2 — execution always requires credentials", () => {
  it("refuses tools/call without a key, with the RFC 9728 challenge", async () => {
    const res = await post(CALL);
    expect(res.status).toBe(401);
    expect(res.headers.get("WWW-Authenticate")).toContain("Bearer");
  });

  it("refuses a rejected key", async () => {
    const res = await post(CALL, { authorization: "Bearer mdk_revoked" });
    expect(res.status).toBe(401);
  });

  it("refuses resources/read without a key", async () => {
    const res = await post({ jsonrpc: "2.0", id: 3, method: "resources/read", params: { uri: "misardev://projects" } });
    expect(res.status).toBe(401);
  });

  it("runs tools/call with a valid key", async () => {
    const realFetch = globalThis.fetch;
    globalThis.fetch = (async () => new Response(JSON.stringify({ projects: [] }), { status: 200 })) as typeof fetch;
    try {
      const res = await post(CALL, { authorization: VALID });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.result.isError).toBe(false);
    } finally {
      globalThis.fetch = realFetch;
    }
  });
});

describe("rule 3 — the refusal is actionable", () => {
  it("tells the user exactly how to get and place a key", async () => {
    const res = await post(CALL);
    const message = (await res.json()).error.message as string;
    expect(message).toContain(AUTH_URLS.apiKeys);
    expect(message).toContain(KEY_PREFIX);
    expect(message).toContain(ENV_KEY);
    expect(message).toContain(CONFIG_PATH);
    expect(message).toContain("env");
    expect(message).toContain(AUTH_URLS.docs);
  });

  it("never points at a browser login this product does not ship", () => {
    expect(HAS_BROWSER_LOGIN).toBe(false);
    const text = authGuidance("missing");
    expect(text).not.toContain(AUTH_URLS.authorize);
    expect(text).not.toMatch(/`login`/);
  });

  it("distinguishes a missing key from a rejected one", () => {
    expect(authGuidance("missing")).toContain("Not authenticated");
    expect(authGuidance("rejected")).toContain("rejected");
    expect(authGuidance("rejected")).toContain(AUTH_URLS.apiKeys);
  });

  it("never leaks a credential into the guidance", () => {
    for (const reason of ["missing", "rejected"] as const) {
      expect(authGuidance(reason)).not.toMatch(/mdk_[A-Za-z0-9]{12,}/);
    }
  });
});
