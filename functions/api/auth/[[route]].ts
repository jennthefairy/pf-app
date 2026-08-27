import { createAuth } from "../../util/auth";
export const onRequest: PagesFunction = async (ctx) => {
  const auth = createAuth(ctx.env as any);
  // Better-auth provides a single handler that routes internally
  return auth.handler(ctx.request);
}
   catch (err) {
    console.error("Auth handler error", err);

    const message = err instanceof Error ? err.message : String(err);
    const hint = message.toLowerCase().includes("database") || message.toLowerCase().includes("neon")
      ? "Check DATABASE_URL and that the Neon database is reachable from Cloudflare."
      : message.toLowerCase().includes("relation") || message.toLowerCase().includes("does not exist")
        ? "Database tables may be missing; ensure migrations/drizzle push ran against the same DATABASE_URL."
        : undefined;

    return new Response(JSON.stringify({ error: "Auth service error", message, hint }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
};
