import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import ts from "typescript";

async function loadRoute(relative) {
  const source = await readFile(new URL(relative, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText
    .replaceAll("@/lib/links", new URL("../lib/links.ts", import.meta.url).href)
    .replaceAll("@/lib/request-security", new URL("../lib/request-security.ts", import.meta.url).href);
  return import("data:text/javascript;base64," + Buffer.from(compiled).toString("base64"));
}
test("API creation and redirect handlers", async (t) => {
  const folder = await mkdtemp(path.join(tmpdir(), "powerlink-api-"));
  const previousMode = process.env.NODE_ENV;
  process.env.NODE_ENV = "test";
  process.env.LINK_DATA_DIR = folder;
  const api = await loadRoute("../app/api/links/route.ts");
  const redirect = await loadRoute("../app/s/[alias]/route.ts");
  const origin = "http://localhost:3000";
  const create = body => api.POST(new Request(origin + "/api/links", { method: "POST", headers: { Origin: origin }, body: JSON.stringify(body) }));
  const context = alias => ({ params: Promise.resolve({ alias }) });
  try {
    await t.test("production API rejects missing keys and accepts the owner behind Render's proxy", async () => {
      process.env.NODE_ENV = "production";
      process.env.CREATE_ACCESS_TOKEN = "test-only-key";
      process.env.RENDER_EXTERNAL_URL = "https://powerlink.example";
      try {
        const request = token => new Request(origin + "/api/links", { method: "POST", headers: { Origin: "https://powerlink.example", ...(token ? { Authorization: "Bearer " + token } : {}) }, body: JSON.stringify({ url: "https://example.com" }) });
        assert.equal((await api.POST(request())).status, 401);
        assert.equal((await api.POST(request("test-only-key"))).status, 201);
      } finally {
        delete process.env.CREATE_ACCESS_TOKEN;
        delete process.env.RENDER_EXTERNAL_URL;
        process.env.NODE_ENV = "test";
      }
    });
    await t.test("returns a real redirect without caching", async () => {
      const response = await create({ url: "https://example.com/article", alias: "api-test" });
      assert.equal(response.status, 201);
      const item = await response.json();
      assert.equal(item.path, "/s/api-test");
      assert.equal(item.passwordHash, undefined);
      const result = await redirect.GET(new Request(origin + item.path), context(item.alias));
      assert.equal(result.status, 303);
      assert.equal(result.headers.get("location"), "https://example.com/article");
      assert.equal(result.headers.get("cache-control"), "no-store");
    });
    await t.test("password gate hides the destination and rejects a wrong password", async () => {
      await create({ url: "https://example.com/private", alias: "locked-test", password: "testing-1234" });
      const gate = await redirect.GET(new Request(origin + "/s/locked-test"), context("locked-test"));
      assert.equal(gate.status, 200);
      const html = await gate.text();
      assert.ok(html.includes('type="password"'));
      assert.ok(!html.includes("https://example.com/private"));
      const post = password => redirect.POST(new Request(origin + "/s/locked-test", { method: "POST", body: new URLSearchParams({ password }) }), context("locked-test"));
      assert.equal((await post("incorrect")).status, 401);
      assert.equal((await post("testing-1234")).headers.get("location"), "https://example.com/private");
    });
    await t.test("handles malformed payloads, missing links, future links and cross-origin requests", async () => {
      assert.equal((await api.POST(new Request(origin + "/api/links", { method: "POST", body: "{" }))).status, 400);
      assert.equal((await create(null)).status, 400);
      assert.equal((await redirect.GET(new Request(origin + "/s/missing-link"), context("missing-link"))).status, 404);
      await create({ url: "https://example.com", alias: "future-link", startsAt: "2099-01-01" });
      assert.equal((await redirect.GET(new Request(origin + "/s/future-link"), context("future-link"))).status, 410);
      assert.equal((await api.POST(new Request(origin + "/api/links", { method: "POST", headers: { Origin: "https://other.example" }, body: JSON.stringify({ url: "https://example.com" }) }))).status, 403);
    });
  } finally {
    if (previousMode === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousMode;
    delete process.env.LINK_DATA_DIR;
    await rm(folder, { recursive: true, force: true });
  }
});
