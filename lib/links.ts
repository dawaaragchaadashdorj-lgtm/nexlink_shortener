import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
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
  await mkdir(linkDirectory(), { recursive: true });
  for (let attempt = 0; attempt < 5; attempt++) {
    const alias = customAlias || randomBytes(6).toString("base64url");
    const link: StoredLink = { alias, url: url.href, createdAt: new Date().toISOString(), startsAt, expiresAt, salt, passwordHash };
    try {
      await writeFile(path.join(linkDirectory(), alias.toLowerCase() + ".json"), JSON.stringify(link), { flag: "wx", mode: 0o600 });
      return link;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      if (customAlias) throw new LinkError("aliasTaken", 409);
    }
  }
  throw new LinkError("serverError", 503);
}
export async function getLink(alias: string): Promise<StoredLink | null> {
  if (!aliasPattern.test(alias)) return null;
  try { return JSON.parse(await readFile(path.join(linkDirectory(), alias.toLowerCase() + ".json"), "utf8")); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return null; throw error; }
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
