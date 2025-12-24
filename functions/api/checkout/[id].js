// Dynamic checkout route implemented in JavaScript to bypass TS duplicate parsing of bracket filename.
// Converts :id path parameter into Stripe Checkout session creation.
import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { getStripe } from "@/util/stripe";
import { eq } from "drizzle-orm";

/**
 * POST /api/checkout/:id
 * Returns { checkoutUrl } for Stripe hosted payment page.
 */
export const onRequestPost = async (ctx) => {
  try {
    const idParam = ctx.params.id;
    const campaignId = Number(idParam);
    if (!idParam || isNaN(campaignId)) {
      return new Response("Invalid campaign ID", { status: 400 });
    }

    const db = getDb(ctx.env);
    const stripe = getStripe(ctx.env);
    const appUrl = ctx.env.APP_BASE_URL;

    const campaign = await db.query.campaigns.findFirst({
      where: eq(schema.campaigns.id, campaignId),
      columns: { title: true, price: true }
    });
    if (!campaign) {
      return new Response("Campaign not found", { status: 404 });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: campaign.title },
            unit_amount: campaign.price,
          },
          quantity: 1,
        }
      ],
      mode: "payment",
      shipping_address_collection: { allowed_countries: ["US", "CA", "GB", "AU"] },
      success_url: `${appUrl}/app-dashboard-filled.html?success=true`,
      cancel_url: `${appUrl}/sale.html?id=${campaignId}`,
      metadata: { campaignId: campaignId.toString() }
    });

    return new Response(JSON.stringify({ checkoutUrl: session.url }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    console.error(err?.message || err);
    return new Response("Internal Server Error", { status: 500 });
  }
};
