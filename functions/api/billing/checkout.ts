import { json, bad } from "../../util/responses";
import { requireUser } from "../../util/auth";

export const onRequestPost: PagesFunction = async (ctx) => {
  // Verify authentication in production
  if ((ctx.env as any).ENV === "production") {
    const user = await requireUser(ctx);
    if (!user) {
      return bad("You must be logged in.", 401);
    }
  }

  try {
    const { price_id, plan, customer_email, user_id, profile_id } = await ctx.request.json() as any;
    
    if (!price_id || !customer_email) {
      return bad("Missing required fields: price_id, customer_email");
    }

    // Build success and cancel URLs
    const baseUrl = new URL(ctx.request.url).origin;
    const successUrl = `${baseUrl}/app/settings.html?success=1`;
    const cancelUrl = `${baseUrl}/app/settings.html?canceled=1`;

    // Create Stripe checkout session
    const params = new URLSearchParams({
      mode: "subscription",
      customer_email,
      "line_items[0][price]": price_id,
      "line_items[0][quantity]": "1",
      success_url: successUrl,
      cancel_url: cancelUrl,
      "metadata[plan]": plan || "",
      "metadata[user_id]": user_id || "",
      "metadata[profile_id]": profile_id || ""
    });

    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
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

    return json({ ok: true, url: data.url });
  } catch (e: any) {
    console.error("Checkout error:", e);
    return bad(e?.message || "checkout_failed");
  }
};
