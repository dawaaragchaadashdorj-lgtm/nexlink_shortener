import { access, mkdir } from "node:fs/promises";
import { constants } from "node:fs";
import { linkDirectory } from "@/lib/links";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    if (process.env.NODE_ENV === "production" && !process.env.CREATE_ACCESS_TOKEN) throw new Error("Creation access token is not configured");
    await mkdir(linkDirectory(), { recursive: true });
    await access(linkDirectory(), constants.R_OK | constants.W_OK);
    return Response.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ status: "unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
