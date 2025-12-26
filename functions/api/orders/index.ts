import { getDb } from "../../db/client";
import * as schema from "../../db/schema";
import { requireUser } from "../../util/auth";
import { eq } from "drizzle-orm";
import { json, bad } from "../../util/responses";

/**
 * GET /api/orders
 * Fetches orders for the currently logged-in user (campaign creator).
 */
export const onRequestGet: PagesFunction = async (ctx) => {
  try {
    const user = await requireUser(ctx);
    if (!user) {
      return bad("Unauthorized", 401);
    }

    const db = getDb(ctx.env as any);
    const orders = await db.query.orders.findMany({
      where: eq(schema.orders.userId, user.id),
      orderBy: (orders, { desc }) => [desc(orders.createdAt)]
    });

    return json({ orders }, { status: 200 });
  } catch (err: any) {
    console.error(err?.message || err);
    return bad("Internal Server Error", 500);
  }
};
