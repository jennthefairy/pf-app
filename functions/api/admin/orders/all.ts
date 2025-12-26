import { getDb } from "../../../db/client";
import { requireAdminUser } from "../../../util/auth";
import { json, bad } from "../../../util/responses";

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

    return json({ orders }, { status: 200 });

  } catch (err: any) {
    return bad(err.message, err.message.includes("permission") ? 403 : 401);
  }
};