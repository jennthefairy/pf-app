import { json, bad } from "../../util/responses";

export const onRequestPost: PagesFunction = async (ctx) => {
  try {
    const { amount, campaign_id, customer_email, customer_name, shipping_address } = await ctx.request.json() as any;

    if (!amount || !campaign_id || !customer_email) {
      return bad("Missing required fields: amount, campaign_id, customer_email");
    }

    // Create Stripe PaymentIntent with manual capture for pre-authorization
    const params = new URLSearchParams({
      amount: amount.toString(),
      currency: "usd",
      capture_method: "manual", // This creates a pre-authorization hold
      "metadata[campaign_id]": campaign_id.toString(),
      "metadata[customer_email]": customer_email,
      "metadata[customer_name]": customer_name || "",
      "metadata[shipping_address]": shipping_address ? JSON.stringify(shipping_address) : ""
    });

    const res = await fetch("https://api.stripe.com/v1/payment_intents", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${(ctx.env as any).STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: params
    });

    const data = await res.json() as any;

    if (!res.ok) {
      console.error("Stripe error:", data);
      return json({ ok: false, error: data?.error?.message || "stripe_error" }, { status: 400 });
    }

    return json({
      ok: true,
      clientSecret: data.client_secret,
      paymentIntentId: data.id
    });
  } catch (e: any) {
    console.error("Checkout error:", e);
    return bad(e?.message || "checkout_failed");
  }
};
