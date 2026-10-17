import { describe, it, expect, vi, afterEach } from "vitest";
import {
  ALL_TOOLS,
  LEGACY_ALIASES,
  dispatch,
  listTools,
  resolveTool,
  MissingScopeError,
  UnknownToolError,
} from "../../src/registry.js";
import { listPrompts, getPrompt, PROMPTS } from "../../src/prompts.js";
import { listResources } from "../../src/resources.js";
import { httpContext } from "../../src/lib/context.js";

const ctx = httpContext("mdk_test", "https://example.invalid");

afterEach(() => vi.restoreAllMocks());

describe("tool catalogue", () => {
  it("exposes every tool with a unique snake_case name", () => {
    const names = ALL_TOOLS.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
    for (const name of names) expect(name).toMatch(/^[a-z][a-z0-9_]*$/);
  });

  it("carries a description and all four annotation hints on every tool", () => {
    for (const tool of ALL_TOOLS) {
      expect(tool.description.length, tool.name).toBeGreaterThan(40);
      expect(tool.annotations.title, tool.name).toBeTruthy();
      expect(tool.annotations).toMatchObject({
        readOnlyHint: expect.any(Boolean),
        destructiveHint: expect.any(Boolean),
        idempotentHint: expect.any(Boolean),
        openWorldHint: expect.any(Boolean),
      });
      // A read-only tool cannot also be destructive.
      if (tool.annotations.readOnlyHint) expect(tool.annotations.destructiveHint, tool.name).toBe(false);
    }
  });

  it("declares an object inputSchema whose required fields all exist", () => {
    for (const tool of ALL_TOOLS) {
      expect(tool.inputSchema.type).toBe("object");
      for (const required of tool.inputSchema.required ?? []) {
        expect(Object.keys(tool.inputSchema.properties ?? {}), tool.name).toContain(required);
      }
    }
  });

  it("classifies every tool with a scope, and every write with a write-ish one", () => {
    for (const tool of ALL_TOOLS) {
      expect(tool.scopes?.length, `${tool.name} has no scopes`).toBeGreaterThan(0);
      if (!tool.annotations.readOnlyHint) {
        expect(tool.scopes!.some((s) => s !== "read"), tool.name).toBe(true);
      }
    }
  });

  it("no longer ships the connector-console tools whose routes were removed", () => {
    for (const gone of [
      "codeshield_scan",
      "codeshield_findings",
      "deploymesh_batches",
      "deploymesh_rollback",
      "chainward_scan",
    ]) {
      expect(resolveTool(gone), gone).toBeUndefined();
    }
  });
});

describe("legacy aliases", () => {
  it("resolves every alias to a real tool", () => {
    for (const [legacy, canonical] of Object.entries(LEGACY_ALIASES)) {
      expect(resolveTool(legacy)?.name, legacy).toBe(canonical);
    }
  });

  it("keeps aliases out of the advertised catalogue", () => {
    const advertised = new Set(listTools().map((t) => t.name));
    for (const legacy of Object.keys(LEGACY_ALIASES)) expect(advertised.has(legacy)).toBe(false);
  });

  it("routes an old name with the old argument spelling to the new handler", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({ results: [] }), { status: 200 }));
    await dispatch("rag_search", { projectId: "p1", query: "auth" }, ctx);
    expect(String(fetchMock.mock.calls[0]![0])).toBe("https://example.invalid/rag?projectId=p1&query=auth");
  });
});

describe("dispatch", () => {
  it("rejects an unknown tool", async () => {
    await expect(dispatch("nope", {}, ctx)).rejects.toBeInstanceOf(UnknownToolError);
  });

  it("enforces scopes when the host supplies a checker", async () => {
    await expect(dispatch("deploy_project", { id: "p1" }, ctx, (req) => req.includes("read"))).rejects.toBeInstanceOf(
      MissingScopeError,
    );
  });

  it("skips the scope check when no checker is supplied (keys carry no scopes)", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    await expect(dispatch("deploy_project", { id: "p1" }, ctx, null)).resolves.toBeDefined();
  });

  it("surfaces the API's own error message, including a nested one", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "Project not found" }), { status: 404 }),
    );
    await expect(dispatch("get_project", { id: "x" }, ctx)).rejects.toThrow("Project not found");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: { message: "Invalid API key" } }), { status: 401 }),
    );
    await expect(dispatch("web_search", { query: "q" }, ctx)).rejects.toThrow("Invalid API key");
  });

  it("renders a plan-limit body as an upgrade card instead of a bare status", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          error: "Monthly build limit reached",
          code: "plan_limit_exceeded",
          upgrade: {
            product: "dev",
            product_name: "MisarDev",
            reason: "quota_exhausted",
            feature: "builds",
            feature_label: "AI builds",
            headline: "You have used all 15 builds on Free this month.",
            usage: null,
            current_plan: { slug: "free", name: "Free" },
            recommended_plan: "pro",
            plans: [
              {
                slug: "pro",
                name: "Pro",
                price: "$20/mo",
                price_note: null,
                recommended: true,
                current: false,
                unlocks: "150 builds a month",
                benefits: ["150 builds a month"],
                url: "https://misar.dev/pricing?plan=pro",
              },
            ],
            topup: null,
            overage: null,
            trial: null,
            cross_sell: [],
            urls: {
              pricing: "https://misar.dev/pricing",
              billing: "https://misar.dev/settings/billing",
              docs: "https://docs.misar.io/dev",
              compare: "https://misar.dev/pricing",
            },
            cta: "Upgrade",
          },
        }),
        { status: 429 },
      ),
    );
    await expect(dispatch("use_template", { id: "t", name: "n" }, ctx)).rejects.toThrow(/misar\.dev\/pricing/);
  });
});

describe("prompts and resources", () => {
  it("lists every prompt", () => {
    expect(listPrompts()).toHaveLength(PROMPTS.length);
  });

  it("only references tool names that exist in the catalogue", () => {
    const known = new Set(ALL_TOOLS.map((t) => t.name));
    for (const prompt of PROMPTS) {
      const body = prompt.build({});
      for (const match of body.matchAll(/\b([a-z]+_[a-z0-9_]+)\b/g)) {
        expect(known.has(match[1]!), `prompt "${prompt.name}" references unknown tool ${match[1]}`).toBe(true);
      }
    }
  });

  it("builds a useful body for every prompt with no arguments", () => {
    for (const prompt of PROMPTS) {
      expect(getPrompt(prompt.name)!.messages[0]!.content.text.length).toBeGreaterThan(50);
    }
  });

  it("exposes resources with misardev:// URIs", () => {
    for (const r of listResources()) {
      expect(r.uri).toMatch(/^misardev:\/\//);
      expect(r.mimeType).toBe("application/json");
    }
  });
});

describe("2.x host compatibility", () => {
  it("runs a dispatch wrapped in runWithContext, as MisarDev's thin routes do", async () => {
    const { runWithContext } = await import("../../src/index.js");
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({ projects: [] }), { status: 200 }));
    await runWithContext(httpContext("mdk_ambient", "https://ambient.invalid/api"), () =>
      dispatch("list_projects", {}),
    );
    expect(String(fetchMock.mock.calls[0]![0])).toBe("https://ambient.invalid/api/projects");
    expect((fetchMock.mock.calls[0]![1] as RequestInit).headers).toMatchObject({ Authorization: "Bearer mdk_ambient" });
  });

  it("refuses a dispatch with no context at all instead of reading process credentials", async () => {
    process.env.MISARDEV_API_KEY = "mdk_from_env_must_not_be_used";
    try {
      await expect(dispatch("list_projects", {})).rejects.toThrow(/No MisarDev credentials/);
    } finally {
      delete process.env.MISARDEV_API_KEY;
    }
  });
});
