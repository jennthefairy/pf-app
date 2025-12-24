import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { requireUser } from "@/util/auth";

/**
 * POST /api/campaigns/create
 * Creates a new campaign. Requires authentication.
 */
export const onRequestPost: PagesFunction = async (ctx) => {
  try {
    const user = await requireUser(ctx);
    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Basic validation
    const { title, price, goal, imageUrl } = await ctx.request.json<any>();
    if (!title || !price || !goal) {
      return new Response("Missing required fields: title, price, goal", { status: 400 });
    }
    
    // Convert to cents
    const priceInCents = Math.round(parseFloat(price) * 100);
    const goalInCents = Math.round(parseFloat(goal) * 100);

    if (isNaN(priceInCents) || isNaN(goalInCents) || priceInCents <= 0 || goalInCents <= 0) {
      return new Response("Invalid price or goal. Must be positive numbers.", { status: 400 });
    }

    const db = getDb(ctx.env as any);
    const [newCampaign] = await db
      .insert(schema.campaigns)
      .values({
        title: title,
        price: priceInCents,
        goal: goalInCents,
        imageUrl: imageUrl || null,
        userId: user.id,
      })
      .returning();

    return new Response(JSON.stringify(newCampaign), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error(err.message);
    return new Response("Internal Server Error", { status: 500 });
  }
};