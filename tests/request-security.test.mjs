import test from "node:test";
import assert from "node:assert/strict";
import { allowAttempt, canCreateLink, isSameOrigin, readLimitedBody } from "../lib/request-security.ts";

test("production creation requires an explicit secret", () => {
  const previous = { mode: process.env.NODE_ENV, token: process.env.CREATE_ACCESS_TOKEN };
  try {
    process.env.NODE_ENV = "production";
    delete process.env.CREATE_ACCESS_TOKEN;
    assert.equal(canCreateLink(new Request("https://example.com")), false);
    process.env.CREATE_ACCESS_TOKEN = "test-only-owner-key";
    assert.equal(canCreateLink(new Request("https://example.com")), false);
    assert.equal(canCreateLink(new Request("https://example.com", { headers: { Authorization: "Bearer incorrect" } })), false);
    assert.equal(canCreateLink(new Request("https://example.com", { headers: { Authorization: "Bearer test-only-owner-key" } })), true);
  } finally {
    if (previous.mode === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previous.mode;
    if (previous.token === undefined) delete process.env.CREATE_ACCESS_TOKEN; else process.env.CREATE_ACCESS_TOKEN = previous.token;
  }
});

test("configured public origin works behind the HTTPS reverse proxy", () => {
  const previous = process.env.APP_ORIGIN;
  try {
    process.env.APP_ORIGIN = "https://powerlink.example";
    assert.equal(isSameOrigin(new Request("http://localhost:10000/api/links", { headers: { Origin: "https://powerlink.example" } })), true);
    assert.equal(isSameOrigin(new Request("http://localhost:10000/api/links", { headers: { Origin: "https://attacker.example", "X-Forwarded-Host": "attacker.example" } })), false);
  } finally {
    if (previous === undefined) delete process.env.APP_ORIGIN; else process.env.APP_ORIGIN = previous;
  }
});

test("attempt limits reset only after their window", () => {
  assert.equal(allowAttempt("test-window", 2, 100), true);
  assert.equal(allowAttempt("test-window", 2, 200), true);
  assert.equal(allowAttempt("test-window", 2, 300), false);
  assert.equal(allowAttempt("test-window", 2, 60100), true);
});

test("body limit counts bytes and cancels oversized streams", async () => {
  assert.equal(await readLimitedBody(new Request("https://example.com", { method: "POST", body: "abcd" }), 4), "abcd");
  assert.equal(await readLimitedBody(new Request("https://example.com", { method: "POST", body: "өөө" }), 4), null);
});
