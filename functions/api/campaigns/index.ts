import { getDb } from "../../db/client";
import * as schema from "../../db/schema";
import { requireUser } from "../../util/auth";
import { eq } from "drizzle-orm";
import { json, bad } from "../../util/responses";

/**
 * GET /api/campaigns
 * Fetches all campaigns for the currently logged-in user.
 */
export const onRequestGet: PagesFunction = async (ctx) => {
  try {
    const user = await requireUser(ctx);
    if (!user) {
      return bad("Unauthorized", 401);
    }

    const db = getDb(ctx.env as any);
    const campaigns = await db.query.campaigns.findMany({
      where: eq(schema.campaigns.userId, user.id),
    });

    return json({ campaigns }, { status: 200 });

  } catch (err: any) {
    console.error(err.message);
    return bad("Internal Server Error", 500);
  }
};

/**
 * POST /api/campaigns
 * Creates a new campaign. Requires authentication.
 */
export const onRequestPost: PagesFunction = async (ctx) => {
  try {
    const user = await requireUser(ctx);
    if (!user) {
      return bad("Unauthorized", 401);
    }

    const body = await ctx.request.json<any>();
    const title = body?.title;
    const price = body?.price;
    const goal = body?.goal;
    const imageUrl = body?.imageUrl;

    if (!title || price == null || goal == null) {
      return bad("Missing required fields: title, price, goal", 400);
    }

    const priceInCents = Math.round(Number(price) * 100);
    const goalInCents = Math.round(Number(goal) * 100);

    if (!Number.isFinite(priceInCents) || !Number.isFinite(goalInCents) || priceInCents <= 0 || goalInCents <= 0) {
      return bad("Invalid price or goal. Must be positive numbers.", 400);
    }

    const db = getDb(ctx.env as any);
    const [newCampaign] = await db
      .insert(schema.campaigns)
      .values({
        title,
        price: priceInCents,
        goal: goalInCents,
        imageUrl: imageUrl || null,
        userId: user.id
      })
      .returning();

    return json(newCampaign, { status: 201 });
  } catch (err: any) {
    console.error(err?.message || err);
    return bad("Internal Server Error", 500);
  }
};