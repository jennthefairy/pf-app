import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { requireUser } from "@/util/auth";
import { eq } from "drizzle-orm";

/**
 * GET /api/campaigns
 * Fetches all campaigns for the currently logged-in user.
 */
export const onRequestGet: PagesFunction = async (ctx) => {
  try {
    const user = await requireUser(ctx);
    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const db = getDb(ctx.env as any);
    const campaigns = await db.query.campaigns.findMany({
      where: eq(schema.campaigns.userId, user.id),
    });

    return new Response(JSON.stringify({ campaigns }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error(err.message);
    return new Response("Internal Server Error", { status: 500 });
  }
};