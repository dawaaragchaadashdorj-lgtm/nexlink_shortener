import test from "node:test";
import assert from "node:assert/strict";

// Runs only against a real database. Set TEST_DATABASE_URL to a throwaway
// Postgres instance; otherwise this suite is skipped so `npm test` stays green.
const dbUrl = process.env.TEST_DATABASE_URL;

test("Postgres storage backend", { skip: dbUrl ? false : "set TEST_DATABASE_URL to run" }, async (t) => {
  process.env.DATABASE_URL = dbUrl;
  try {
    const { createLink, getLink, checkStorage } = await import("../lib/links.ts");
    const run = Date.now().toString(36);

    await t.test("checkStorage provisions the schema", async () => {
      await checkStorage();
    });

    await t.test("inserts and reads back a link without exposing plaintext passwords", async () => {
      const link = await createLink({ url: "https://example.com/pg?q=1", alias: "pg-" + run, password: "correct-password" }, "http://localhost:3000");
      const fetched = await getLink(link.alias);
      assert.equal(fetched.url, "https://example.com/pg?q=1");
      assert.equal(fetched.passwordHash, link.passwordHash);
      assert.notEqual(fetched.passwordHash, null);
    });

    await t.test("enforces case-insensitive alias uniqueness", async () => {
      await assert.rejects(createLink({ url: "https://example.com", alias: "PG-" + run }, ""), { code: "aliasTaken" });
    });

    await t.test("returns null for a missing alias", async () => {
      assert.equal(await getLink("missing-" + run), null);
    });
  } finally {
    delete process.env.DATABASE_URL;
  }
});
