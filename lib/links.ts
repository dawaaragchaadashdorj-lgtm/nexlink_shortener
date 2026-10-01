import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
export const linkDirectory = () => process.env.LINK_DATA_DIR || path.join(process.cwd(), ".data", "links");
export const aliasPattern = /^[a-zA-Z0-9_-]{3,48}$/;
export type StoredLink = {
  alias: string; url: string; createdAt: string;
  startsAt: string | null; expiresAt: string | null;
  passwordHash: string | null; salt: string | null;
};
export class LinkError extends Error {
  code: string;
  status: number;
  constructor(code: string, status = 400) { super(code); this.code = code; this.status = status; }
}

// Storage backend: Postgres when a connection string is present (serverless/
// diskless hosts), otherwise the local filesystem (development and tests).
// POSTGRES_URL is the name Vercel's Neon integration injects; DATABASE_URL is
// the generic name used by Render and most other providers.
const dbUrl = () => process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
const usingPostgres = () => Boolean(dbUrl());

type Pool = import("pg").Pool;
let poolPromise: Promise<Pool> | null = null;
let schemaPromise: Promise<void> | null = null;

function getPool(): Promise<Pool> {
  if (!poolPromise) {
    poolPromise = import("pg").then(({ Pool }) => new Pool({
      connectionString: dbUrl(),
      ssl: { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false" },
      max: Number(process.env.DATABASE_POOL_MAX) || 5,
    }));
  }
  return poolPromise;
}

async function ensureSchema(): Promise<void> {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      const pool = await getPool();
      await pool.query(`CREATE TABLE IF NOT EXISTS links (
        alias_lower TEXT PRIMARY KEY,
        alias TEXT NOT NULL,
        url TEXT NOT NULL,
        created_at TEXT NOT NULL,
        starts_at TEXT,
        expires_at TEXT,
        password_hash TEXT,
        salt TEXT
      )`);
    })();
  }
  return schemaPromise;
}

async function pgInsert(link: StoredLink): Promise<boolean> {
  await ensureSchema();
  const pool = await getPool();
  try {
    await pool.query(
      `INSERT INTO links (alias_lower, alias, url, created_at, starts_at, expires_at, password_hash, salt)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [link.alias.toLowerCase(), link.alias, link.url, link.createdAt, link.startsAt, link.expiresAt, link.passwordHash, link.salt],
    );
    return true;
  } catch (error) {
    if ((error as { code?: string }).code === "23505") return false;
    throw error;
  }
}

async function pgGet(aliasLower: string): Promise<StoredLink | null> {
  await ensureSchema();
  const pool = await getPool();
  const { rows } = await pool.query(
    `SELECT alias, url, created_at, starts_at, expires_at, password_hash, salt FROM links WHERE alias_lower = $1`,
    [aliasLower],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    alias: row.alias, url: row.url, createdAt: row.created_at,
    startsAt: row.starts_at, expiresAt: row.expires_at,
    passwordHash: row.password_hash, salt: row.salt,
  };
}

async function fsInsert(link: StoredLink): Promise<boolean> {
  await mkdir(linkDirectory(), { recursive: true });
  try {
    await writeFile(path.join(linkDirectory(), link.alias.toLowerCase() + ".json"), JSON.stringify(link), { flag: "wx", mode: 0o600 });
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") return false;
    throw error;
  }
}

async function fsGet(aliasLower: string): Promise<StoredLink | null> {
  try { return JSON.parse(await readFile(path.join(linkDirectory(), aliasLower + ".json"), "utf8")); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return null; throw error; }
}

const insertLink = (link: StoredLink) => (usingPostgres() ? pgInsert(link) : fsInsert(link));
const readLink = (aliasLower: string) => (usingPostgres() ? pgGet(aliasLower) : fsGet(aliasLower));

export async function checkStorage(): Promise<void> {
  if (usingPostgres()) { await ensureSchema(); return; }
  await mkdir(linkDirectory(), { recursive: true });
  await access(linkDirectory(), constants.R_OK | constants.W_OK);
}

function optionalDate(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) throw new LinkError("invalidDate");
  return new Date(value).toISOString();
}

export async function createLink(input: Record<string, unknown>, origin: string) {
  if (typeof input.url !== "string" || input.url.length > 4096) throw new LinkError("invalidUrl");
  let url: URL;
  try { url = new URL(input.url.trim()); } catch { throw new LinkError("invalidUrl"); }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) throw new LinkError("invalidUrl");
  if (url.origin === origin && url.pathname.startsWith("/s/")) throw new LinkError("recursiveUrl");
  if (input.alias !== undefined && typeof input.alias !== "string") throw new LinkError("invalidAlias");
  const customAlias = typeof input.alias === "string" ? input.alias.trim() : "";
  if (customAlias && (!aliasPattern.test(customAlias) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(customAlias))) throw new LinkError("invalidAlias");
  const startsAt = optionalDate(input.startsAt);
  const expiresAt = optionalDate(input.expiresAt);
  if (expiresAt && (Date.parse(expiresAt) <= Date.now() || (startsAt && expiresAt <= startsAt))) throw new LinkError("invalidRange");
  if (input.password !== undefined && typeof input.password !== "string") throw new LinkError("invalidPassword");
  const password = typeof input.password === "string" ? input.password : "";
  if (password && (password.length < 8 || password.length > 128)) throw new LinkError("invalidPassword");
  const salt = password ? randomBytes(16).toString("hex") : null;
  const passwordHash = password ? ((await scrypt(password, salt!, 64)) as Buffer).toString("hex") : null;
  for (let attempt = 0; attempt < 5; attempt++) {
    const alias = customAlias || randomBytes(6).toString("base64url");
    const link: StoredLink = { alias, url: url.href, createdAt: new Date().toISOString(), startsAt, expiresAt, salt, passwordHash };
    if (await insertLink(link)) return link;
    if (customAlias) throw new LinkError("aliasTaken", 409);
  }
  throw new LinkError("serverError", 503);
}

export async function getLink(alias: string): Promise<StoredLink | null> {
  if (!aliasPattern.test(alias)) return null;
  return readLink(alias.toLowerCase());
}

export function availability(link: StoredLink, now = Date.now()) {
  if (link.startsAt && Date.parse(link.startsAt) > now) return "scheduled";
  if (link.expiresAt && Date.parse(link.expiresAt) <= now) return "expired";
  return "active";
}

export async function verifyPassword(link: StoredLink, password: string) {
  if (!link.passwordHash || !link.salt || password.length > 128) return false;
  const actual = (await scrypt(password, link.salt, 64)) as Buffer;
  return timingSafeEqual(Buffer.from(link.passwordHash, "hex"), actual);
}
