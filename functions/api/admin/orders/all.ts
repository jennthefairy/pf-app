import { getDb } from "@/db/client";
import { requireAdminUser } from "@/util/auth";

/**
 * GET /api/admin/orders/all
 * Fetches ALL orders. Admin only.
 */
export const onRequestGet: PagesFunction = async (ctx) => {
  try {
    await requireAdminUser(ctx); // Throws error if not admin

    const db = getDb(ctx.env as any);
    const orders = await db.query.orders.findMany({
      orderBy: (orders, { desc }) => [desc(orders.createdAt)],
    });

    return new Response(JSON.stringify({ orders }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (err: any) {
    return new Response(err.message, { status: err.message.includes("permission") ? 403 : 401 });
  }
};