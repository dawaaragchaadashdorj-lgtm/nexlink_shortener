import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createLink, getLink, availability, verifyPassword } from "../lib/links.ts";

test("link lifecycle and invalid input", async (t) => {
  const folder = await mkdtemp(path.join(tmpdir(), "powerlink-test-"));
  process.env.LINK_DATA_DIR = folder;
  try {
    await t.test("persists a working destination without exposing plaintext passwords", async () => {
      const link = await createLink({ url: "https://example.com/path?q=1", alias: "secure-link", password: "correct-password" }, "http://localhost:3000");
      assert.equal((await getLink(link.alias)).url, "https://example.com/path?q=1");
      assert.equal(await verifyPassword(link, "correct-password"), true);
      assert.equal(await verifyPassword(link, "wrong-password"), false);
      assert.equal((await readFile(path.join(folder, "secure-link.json"), "utf8")).includes("correct-password"), false);
    });
    await t.test("prevents duplicate aliases, including case variants and concurrent creation", async () => {
      await assert.rejects(createLink({ url: "https://example.com", alias: "SECURE-LINK" }, ""), { code: "aliasTaken" });
      const results = await Promise.allSettled([1, 2].map(() => createLink({ url: "https://example.com", alias: "same-link" }, "")));
      assert.equal(results.filter(r => r.status === "fulfilled").length, 1);
    });
    await t.test("rejects invalid destinations, aliases, passwords and schedules", async () => {
      for (const input of [
        { url: "javascript:alert(1)" }, { url: "file:///tmp/example" }, { url: "https://user:secret@example.com" },
        { url: "https://example.com", alias: "CON" }, { url: "https://example.com", alias: "../../file" }, { url: "https://example.com", password: "short" },
        { url: "https://example.com", expiresAt: "2020-01-01" }, { url: "https://example.com", startsAt: "invalid" },
        { url: "https://example.com", startsAt: "2099-02-01", expiresAt: "2099-01-01" },
      ]) await assert.rejects(createLink(input, "http://localhost:3000"));
      await assert.rejects(createLink({ url: "http://localhost:3000/s/another" }, "http://localhost:3000"), { code: "recursiveUrl" });
      assert.equal(await getLink("../outside"), null);
      assert.equal(await getLink("missing-link"), null);
    });
    await t.test("honors exact start and expiry boundaries", async () => {
      const link = await createLink({ url: "https://example.com", startsAt: "2099-01-01T00:00:00Z", expiresAt: "2099-01-02T00:00:00Z" }, "");
      const start = Date.parse(link.startsAt), end = Date.parse(link.expiresAt);
      assert.equal(availability(link, start - 1), "scheduled");
      assert.equal(availability(link, start), "active");
      assert.equal(availability(link, end - 1), "active");
      assert.equal(availability(link, end), "expired");
    });
  } finally {
    delete process.env.LINK_DATA_DIR;
    // Only this test's freshly-created temporary directory is removed.
    await rm(folder, { recursive: true, force: true });
  }
});
