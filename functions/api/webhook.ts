import { getDb } from "../db/client";
import * as schema from "../db/schema";
import { eq, sql } from "drizzle-orm";
import { getStripe } from "../util/stripe";

/**
 * Handles incoming webhooks from Stripe.
 * NOW saves shipping information.
 */
export const onRequestPost: PagesFunction = async ({ request, env }) => {
  const stripe = getStripe(env as any);
  const db = getDb(env as any);

  // 1. Verify the signature
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing stripe-signature header", { status: 400 });
  }

  let event;
  try {
    const rawBody = await request.text();
    event = await stripe.webhooks.constructEvent(
      rawBody,
      signature,
      (env as any).STRIPE_WEBHOOK_SECRET
    );
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // 2. Handle the 'checkout.session.completed' event
  if (event.type === "checkout.session.completed") {
    const session: any = event.data.object;

    // Get data from the session
    const campaignIdStr: string = (session.metadata && session.metadata.campaignId) || "";
    const campaignId = parseInt(campaignIdStr, 10);
    const amountPaid = session.amount_total;
    
    // Get customer info
    const customerEmail = session.customer_details?.email;
    const customerName = session.customer_details?.name;
    const shippingDetails = (session as any).shipping_details;

    if (!campaignId || !customerEmail || amountPaid === null) {
      console.error("Webhook missing critical data:", { campaignId, customerEmail, amountPaid });
      return new Response("Webhook missing metadata", { status: 400 });
    }
    
    // Serialize shipping address to JSON string
    const shippingAddress = shippingDetails ? JSON.stringify(shippingDetails.address, null, 2) : null;

    try {
      const campaign = await db.query.campaigns.findFirst({
        where: eq(schema.campaigns.id, campaignId),
        columns: { title: true, userId: true }
      });
      
      if (!campaign) throw new Error(`Campaign ${campaignId} not found.`);

      // Use a transaction
      await db.transaction(async (tx: any) => {
        // 1. Increment campaign funds
        await tx
          .update(schema.campaigns)
          .set({
            currentAmountRaised: sql`${schema.campaigns.currentAmountRaised} + ${amountPaid}`,
          })
          .where(eq(schema.campaigns.id, campaignId));

        // 2. Create the new order with all customer info
        await tx.insert(schema.orders).values({
          campaignId: campaignId,
          userId: campaign.userId,
          campaignTitle: campaign.title,
          customerEmail: customerEmail,
          customerName: customerName,
          shippingAddress: shippingAddress,
          amountPaid: amountPaid,
          fulfillmentStatus: "PENDING",
        });
      });

    } catch (err: any) {
      console.error(`Failed to process webhook: ${err.message}`);
      return new Response(`Internal Server Error: ${err.message}`, { status: 500 });
    }
  }

  // 3. Acknowledge receipt to Stripe
  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};