import { createLink, LinkError } from "@/lib/links";
import { allowAttempt, canCreateLink, isSameOrigin, publicOrigin, readLimitedBody } from "@/lib/request-security";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const origin = publicOrigin(request);
    if (!isSameOrigin(request)) return Response.json({ error: "forbidden" }, { status: 403 });
    if (!canCreateLink(request)) return Response.json({ error: "accessRequired" }, { status: 401 });
    if (!allowAttempt("create", 60)) return Response.json({ error: "tooMany" }, { status: 429, headers: { "Retry-After": "60" } });
    const body = await readLimitedBody(request, 8192);
    if (body === null) return Response.json({ error: "invalidRequest" }, { status: 413 });
    let input;
    try { input = JSON.parse(body); } catch { return Response.json({ error: "invalidRequest" }, { status: 400 }); }
    if (!input || typeof input !== "object" || Array.isArray(input)) return Response.json({ error: "invalidRequest" }, { status: 400 });
    const link = await createLink(input, origin);
    return Response.json({ alias: link.alias, originalUrl: link.url, path: "/s/" + link.alias, createdAt: link.createdAt, startsAt: link.startsAt, expiresAt: link.expiresAt, protected: !!link.passwordHash }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof LinkError) return Response.json({ error: error.code }, { status: error.status });
    console.error("Link creation failed", error);
    return Response.json({ error: "serverError" }, { status: 500 });
  }
}
