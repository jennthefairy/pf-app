import { createAuth } from "../../util/auth";
export const onRequest: PagesFunction = async (ctx) => {
  const missing: string[] = [];
  if (!(ctx.env as any)?.DATABASE_URL) missing.push("DATABASE_URL");
  if (!(ctx.env as any)?.BETTER_AUTH_SECRET) missing.push("BETTER_AUTH_SECRET");

  if (missing.length) {
    return new Response(
      JSON.stringify({
        error: `Server misconfigured. Missing env var(s): ${missing.join(", ")}`,
      }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }

  try {
    const auth = await createAuth(ctx.env as any);
    // Better-auth provides a single handler that routes internally
    return await auth.handler(ctx.request);
  } catch (err) {
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
