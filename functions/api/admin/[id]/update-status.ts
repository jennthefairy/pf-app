import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { requireAdminUser } from "@/util/auth";
import { eq } from "drizzle-orm";

/**
 * POST /api/admin/orders/[id]/update-status
 * Updates an order's fulfillment status. Admin only.
 */
export const onRequestPost: PagesFunction = async (ctx) => {
  try {
    await requireAdminUser(ctx); // Throws error if not admin

    const orderId = Number(ctx.params.id);
    if (isNaN(orderId)) {
      return new Response("Invalid order ID", { status: 400 });
    }

    const { newStatus } = await ctx.request.json<any>();
    if (!newStatus || !["PROCESSING", "SHIPPED"].includes(newStatus)) {
      return new Response("Invalid status. Must be 'PROCESSING' or 'SHIPPED'", { status: 400 });
    }

    const db = getDb(ctx.env as any);
    const [updatedOrder] = await db
      .update(schema.orders)
      .set({ fulfillmentStatus: newStatus })
      .where(eq(schema.orders.id, orderId))
      .returning();

    if (!updatedOrder) {
      return new Response("Order not found", { status: 404 });
    }

    return new Response(JSON.stringify(updatedOrder), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (err: any) {
    return new Response(err.message, { status: err.message.includes("permission") ? 403 : 401 });
  }
};