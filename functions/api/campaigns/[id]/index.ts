import { getDb } from "../../../db/client";
import * as schema from "../../../db/schema";
import { requireUser } from "../../../util/auth";
import { eq, and } from "drizzle-orm";
import { json, bad } from "../../../util/responses";

/**
 * GET /api/campaigns/[id]
 * Fetches a single campaign for the currently logged-in user (must own).
 */
export const onRequestGet: PagesFunction = async (ctx) => {
  try {
    const user = await requireUser(ctx);
    if (!user) {
      return bad("Unauthorized", 401);
    }

    const campaignId = Number(ctx.params.id);
    if (Number.isNaN(campaignId)) {
      return bad("Invalid campaign ID", 400);
    }

    const db = getDb(ctx.env as any);
    const campaign = await db.query.campaigns.findFirst({
      where: and(eq(schema.campaigns.id, campaignId), eq(schema.campaigns.userId, user.id))
    });

    if (!campaign) {
      return bad("Campaign not found", 404);
    }

    return json(campaign, { status: 200 });
  } catch (err: any) {
    console.error(err?.message || err);
    return bad("Internal Server Error", 500);
  }
};

/**
 * PUT /api/campaigns/[id]
 * Updates a campaign. Requires user to be the owner.
 */
export const onRequestPut: PagesFunction = async (ctx) => {
  try {
    const user = await requireUser(ctx);
    if (!user) {
      return bad("Unauthorized", 401);
    }

    const campaignId = Number(ctx.params.id);
    if (Number.isNaN(campaignId)) {
      return bad("Invalid campaign ID", 400);
    }

    const body = await ctx.request.json<any>();
    const title = body?.title;
    const imageUrl = body?.imageUrl;

    if (title == null && imageUrl == null) {
      return bad("No fields to update", 400);
    }

    const updates: Record<string, unknown> = {};
    if (title != null) updates.title = title;
    if (imageUrl != null) updates.imageUrl = imageUrl;

    const db = getDb(ctx.env as any);
    
    // Update and return the *first* updated record
    const [updatedCampaign] = await db
      .update(schema.campaigns)
      .set(updates)
      .where(
        // Security: Ensure user owns this campaign
        and(
          eq(schema.campaigns.id, campaignId),
          eq(schema.campaigns.userId, user.id)
        )
      )
      .returning();
      
    if (!updatedCampaign) {
      return bad("Campaign not found or you do not have permission", 404);
    }

    return json(updatedCampaign, { status: 200 });

  } catch (err: any) {
    console.error(err.message);
    return bad("Internal Server Error", 500);
  }
};

/**
 * DELETE /api/campaigns/[id]
 * Deletes a campaign. Requires user to be the owner.
 */
export const onRequestDelete: PagesFunction = async (ctx) => {
  try {
    const user = await requireUser(ctx);
    if (!user) {
      return bad("Unauthorized", 401);
    }

    const campaignId = Number(ctx.params.id);
    if (Number.isNaN(campaignId)) {
      return bad("Invalid campaign ID", 400);
    }

    const db = getDb(ctx.env as any);
    const [deleted] = await db
      .delete(schema.campaigns)
      .where(and(eq(schema.campaigns.id, campaignId), eq(schema.campaigns.userId, user.id)))
      .returning();

    if (!deleted) {
      return bad("Campaign not found or you do not have permission", 404);
    }

    return json({ ok: true }, { status: 200 });
  } catch (err: any) {
    console.error(err?.message || err);
    return bad("Internal Server Error", 500);
  }
};