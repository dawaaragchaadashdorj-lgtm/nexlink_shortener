import { availability, getLink, verifyPassword } from "@/lib/links";
import { allowAttempt, isSameOrigin, readLimitedBody } from "@/lib/request-security";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ alias: string }> };
const headers = { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'" };
function screen(title: string, message: string, status: number, form = false) {
  return new Response(`<!doctype html><html lang="mn"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} · PowerLink</title><style>html{color-scheme:dark}body{margin:0;min-height:100dvh;display:grid;place-items:center;background:#080d18;color:#f1f5ff;font:16px/1.6 system-ui}main{box-sizing:border-box;width:min(440px,92%);padding:32px;border:1px solid #33415d;border-radius:24px;background:#111b2e}h1{font-size:24px}p{color:#bdc9dd}input,button{box-sizing:border-box;width:100%;padding:14px;margin-top:12px;border-radius:10px;font:inherit}input{background:#080d18;color:white;border:1px solid #657898}button{background:#2563eb;color:white;border:0;cursor:pointer}a{color:#93c5fd}:focus-visible{outline:3px solid #93c5fd;outline-offset:3px}</style><main><a href="/">PowerLink</a><h1>${title}</h1><p>${message}</p>${form ? '<form method="post"><label for="password">Нууц үг / Password</label><input id="password" name="password" type="password" required maxlength="128" autocomplete="current-password"><button type="submit">Нээх / Open link</button></form>' : '<a href="/">Нүүр хуудас / Home</a>'}</main></html>`, { status, headers });
}
async function resolve(request: Request, context: Context) {
  const { alias } = await context.params;
  const link = await getLink(alias);
  if (!link) return screen("Холбоос олдсонгүй", "This link does not exist. Check the address and try again.", 404);
  const state = availability(link);
  if (state !== "active") return screen(state === "expired" ? "Хугацаа дууссан" : "Хараахан идэвхжээгүй", state === "expired" ? "This link has expired." : "This link is scheduled for later.", 410);
  if (link.passwordHash) {
    if (request.method === "GET") return screen("Хамгаалалттай холбоос", "Enter the password to continue.", 200, true);
    if (!isSameOrigin(request)) return screen("Хүсэлт зөвшөөрөгдөөгүй", "Please open the link again.", 403);
    if (!allowAttempt("unlock-total", 120) || !allowAttempt("unlock:" + alias.toLowerCase(), 10)) {
      const response = screen("Түр хүлээнэ үү", "Too many attempts. Try again in one minute.", 429);
      response.headers.set("Retry-After", "60");
      return response;
    }
    const raw = await readLimitedBody(request, 2048);
    if (raw === null) return screen("Буруу нууц үг", "Please try again.", 413, true);
    const password = new URLSearchParams(raw).get("password") || "";
    if (!(await verifyPassword(link, password))) return screen("Буруу нууц үг", "Incorrect password. Please try again.", 401, true);
  }
  return new Response(null, { status: 303, headers: { Location: link.url, "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
}
export const GET = resolve;
export const POST = resolve;
