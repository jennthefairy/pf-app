import { getDb } from "../../../../db/client";
import * as schema from "../../../../db/schema";
import { requireAdminUser } from "../../../../util/auth";
import { eq } from "drizzle-orm";
import { json, bad } from "../../../../util/responses";

/**
 * POST /api/admin/orders/[id]/update-status
 * Updates an order's fulfillment status. Admin only.
 */
export const onRequestPost: PagesFunction = async (ctx) => {
  try {
    await requireAdminUser(ctx);

    const orderId = Number(ctx.params.id);
    if (Number.isNaN(orderId)) {
      return bad("Invalid order ID", 400);
    }

    const { newStatus } = await ctx.request.json<any>();
    if (!newStatus || !["PROCESSING", "SHIPPED"].includes(newStatus)) {
      return bad("Invalid status. Must be 'PROCESSING' or 'SHIPPED'", 400);
    }

    const db = getDb(ctx.env as any);
    const [updatedOrder] = await db
      .update(schema.orders)
      .set({ fulfillmentStatus: newStatus })
      .where(eq(schema.orders.id, orderId))
      .returning();

    if (!updatedOrder) {
      return bad("Order not found", 404);
    }

    return json(updatedOrder, { status: 200 });
  } catch (err: any) {
    const msg = err?.message || String(err);
    if (msg.includes("permission")) return bad(msg, 403);
    if (msg.includes("logged in")) return bad(msg, 401);
    return bad(msg, 400);
  }
};
