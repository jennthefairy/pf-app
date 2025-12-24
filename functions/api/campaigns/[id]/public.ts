import { getDb } from "../../../db/client";
import * as schema from "../../../db/schema";
import { eq } from "drizzle-orm";

/**
 * GET /api/campaigns/[id]/public
 * Fetches a single campaign's data for the public sale page. No auth required.
 */
export const onRequestGet: PagesFunction = async (ctx) => {
  try {
    const campaignId = Number(ctx.params.id);
    if (isNaN(campaignId)) {
      return new Response("Invalid campaign ID", { status: 400 });
    }

    const db = getDb(ctx.env as any);
    const campaign = await db.query.campaigns.findFirst({
      where: eq(schema.campaigns.id, campaignId),
      // Only select fields safe for the public
      columns: {
        title: true,
        imageUrl: true,
        price: true,
        goal: true,
        currentAmountRaised: true
      }
    });

    if (!campaign) {
      return new Response("Campaign not found", { status: 404 });
    }

    return new Response(JSON.stringify({ campaign }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error(err.message);
    return new Response("Internal Server Error", { status: 500 });
  }
};