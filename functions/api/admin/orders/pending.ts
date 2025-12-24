import { getDb } from "../../../db/client";
import * as schema from "../../../db/schema";
import { requireAdminUser } from "../../../util/auth";
import { eq } from "drizzle-orm";

/**
 * GET /api/admin/orders/pending
 * Fetches all orders with 'PENDING' fulfillment status. Admin only.
 */
export const onRequestGet: PagesFunction = async (ctx) => {
  try {
    await requireAdminUser(ctx); // Throws error if not admin

    const db = getDb(ctx.env as any);
    const orders = await db.query.orders.findMany({
      where: eq(schema.orders.fulfillmentStatus, "PENDING"),
    });

    return new Response(JSON.stringify({ orders }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (err: any) {
    return new Response(err.message, { status: err.message.includes("permission") ? 403 : 401 });
  }
};