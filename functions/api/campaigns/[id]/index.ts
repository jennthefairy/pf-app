import { getDb } from "../../../db/client";
import * as schema from "../../../db/schema";
import { requireUser } from "../../../util/auth";
import { eq, and } from "drizzle-orm";

/**
 * PUT /api/campaigns/[id]
 * Updates a campaign. Requires user to be the owner.
 */
export const onRequestPut: PagesFunction = async (ctx) => {
  try {
    const user = await requireUser(ctx);
    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const campaignId = Number(ctx.params.id);
    if (isNaN(campaignId)) {
      return new Response("Invalid campaign ID", { status: 400 });
    }

    const { title, imageUrl } = await ctx.request.json<any>();
    if (!title && !imageUrl) {
      return new Response("No fields to update", { status: 400 });
    }

    const db = getDb(ctx.env as any);
    
    // Update and return the *first* updated record
    const [updatedCampaign] = await db
      .update(schema.campaigns)
      .set({
        title: title,
        imageUrl: imageUrl,
      })
      .where(
        // Security: Ensure user owns this campaign
        and(
          eq(schema.campaigns.id, campaignId),
          eq(schema.campaigns.userId, user.id)
        )
      )
      .returning();
      
    if (!updatedCampaign) {
      return new Response("Campaign not found or you do not have permission", { status: 404 });
    }

    return new Response(JSON.stringify(updatedCampaign), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error(err.message);
    return new Response("Internal Server Error", { status: 500 });
  }
};