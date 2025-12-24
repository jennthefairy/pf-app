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
    const { customer_id } = await ctx.request.json() as any;
    
    if (!customer_id) {
      return bad("Missing required field: customer_id");
    }

    // Build return URL
    const baseUrl = new URL(ctx.request.url).origin;
    const returnUrl = `${baseUrl}/app/settings.html`;

    // Create Stripe customer portal session
    const params = new URLSearchParams({
      customer: customer_id,
      return_url: returnUrl
    });

    const res = await fetch("https://api.stripe.com/v1/billing_portal/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${(ctx.env as any).STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: params
    });

    const data = await res.json() as any;
    
    if (!res.ok) {
      console.error("Stripe portal error:", data);
      return json({ ok: false, error: data?.error?.message || "portal_error" }, { status: 400 });
    }

    return json({ ok: true, url: data.url });
  } catch (e: any) {
    console.error("Portal error:", e);
    return bad(e?.message || "portal_failed");
  }
};
