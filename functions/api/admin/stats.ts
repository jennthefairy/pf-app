import { getDb } from "../../db/client";
import * as schema from "../../db/schema";
import { requireAdminUser } from "../../util/auth";
import { count, sum } from "drizzle-orm";

/**
 * GET /api/admin/stats
 * Fetches platform-wide stats for the admin dashboard.
 */
export const onRequestGet: PagesFunction = async (ctx) => {
  try {
    await requireAdminUser(ctx); // Throws error if not admin
    const db = getDb(ctx.env as any);

    // 1. Total Revenue
    const revenueResult = await db
      .select({ total: sum(schema.orders.amountPaid) })
      .from(schema.orders);
    const totalRevenue = Number(revenueResult[0].total) || 0;

    // 2. Total Orders
    const ordersResult = await db
      .select({ total: count() })
      .from(schema.orders);
    const totalOrders = ordersResult[0].total;

    // 3. Total Users
    const usersResult = await db
      .select({ total: count() })
      .from(schema.users);
    const totalUsers = usersResult[0].total;

    // 4. Total Campaigns
    const campaignsResult = await db
      .select({ total: count() })
      .from(schema.campaigns);
    const totalCampaigns = campaignsResult[0].total;

    const stats = {
      totalRevenue,
      totalOrders,
      totalUsers,
      totalCampaigns,
    };

    return new Response(JSON.stringify(stats), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (err: any) {
    return new Response(err.message, { status: err.message.includes("permission") ? 403 : 401 });
  }
};