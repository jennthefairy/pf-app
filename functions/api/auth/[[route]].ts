import { createAuth } from "../../util/auth";

type Env = {
  DATABASE_URL?: string;
  BETTER_AUTH_SECRET?: string;
};

function getMissingEnv(env: Env): string[] {
  const missing: string[] = [];
  if (!env.DATABASE_URL) missing.push("DATABASE_URL");
  if (!env.BETTER_AUTH_SECRET) missing.push("BETTER_AUTH_SECRET");
  return missing;
}

function buildHint(message: string): string | undefined {
  const lower = message.toLowerCase();

  if (lower.includes("database") || lower.includes("neon")) {
    return "Check DATABASE_URL and that the Neon database is reachable from Cloudflare.";
  }

  if (lower.includes("relation") || lower.includes("does not exist")) {
    return "Database tables may be missing; ensure migrations/drizzle push ran against the same DATABASE_URL.";
  }

  return undefined;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export const onRequest: PagesFunction<Env> = async (ctx) => {
  const missing = getMissingEnv(ctx.env);

  if (missing.length > 0) {
    return jsonResponse(
      {
        error: `Server misconfigured. Missing env var(s): ${missing.join(", ")}`,
      },
      500
    );
  }

  try {
    const auth = await createAuth(ctx.env);
    return await auth.handler(ctx.request);
  } catch (err: unknown) {
    console.error("Auth handler error", err);

    const message = err instanceof Error ? err.message : String(err);

    return jsonResponse(
      {
        error: "Auth service error",
        message,
        hint: buildHint(message),
      },
      500
    );
  }
};
