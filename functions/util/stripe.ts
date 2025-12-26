import Stripe from "stripe";

/**
 * Utility function to get a memoized instance of the Stripe client.
 */
let _stripe: Stripe;
export function getStripe(env: { STRIPE_SECRET_KEY: string }) {
  if (!_stripe) {
    _stripe = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-12-15.clover",
    });
  }
  return _stripe;
}