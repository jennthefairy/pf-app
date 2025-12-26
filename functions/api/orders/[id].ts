import { getDb } from "../../db/client";
import * as schema from "../../db/schema";
import { requireAdminUser, requireUser } from "../../util/auth";
import { and, eq } from "drizzle-orm";
import { json, bad } from "../../util/responses";

/**
 * GET /api/orders/[id]
 * Fetch a single order for the logged-in campaign creator.
 */
export const onRequestGet: PagesFunction = async (ctx) => {
  try {
    const user = await requireUser(ctx);
    if (!user) {
      return bad("Unauthorized", 401);
    }

    const orderId = Number(ctx.params.id);
    if (Number.isNaN(orderId)) {
      return bad("Invalid order ID", 400);
    }

    const db = getDb(ctx.env as any);
    const order = await db.query.orders.findFirst({
      where: and(eq(schema.orders.id, orderId), eq(schema.orders.userId, user.id))
    });

    if (!order) {
      return bad("Order not found", 404);
    }

    return json(order, { status: 200 });
  } catch (err: any) {
    console.error(err?.message || err);
    return bad("Internal Server Error", 500);
  }
};

/**
 * PUT /api/orders/[id]
 * Updates an order's fulfillment status. Admin only.
 * Accepts `{ newStatus }` or `{ fulfillmentStatus }`.
 */
export const onRequestPut: PagesFunction = async (ctx) => {
  try {
    await requireAdminUser(ctx);

    const orderId = Number(ctx.params.id);
    if (Number.isNaN(orderId)) {
      return bad("Invalid order ID", 400);
    }

    const body = await ctx.request.json<any>();
    const newStatus = body?.newStatus || body?.fulfillmentStatus;

    if (!newStatus || !["PENDING", "PROCESSING", "SHIPPED"].includes(newStatus)) {
      return bad("Invalid status. Must be 'PENDING', 'PROCESSING', or 'SHIPPED'", 400);
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
    console.error(msg);
    return bad("Internal Server Error", 500);
  }
};
