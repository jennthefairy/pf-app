import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { eq } from "drizzle-orm";
import { getDb } from "../db/client";
import { users } from "../db/schema";

export function createAuth(env: any) {
  const db = getDb(env);

  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "pg",
      usePlural: false,
    }),
    secret: env.BETTER_AUTH_SECRET,
  });
}

export async function requireUser(ctx: { env: any; request: Request }) {
  const auth = createAuth(ctx.env);
  const session = await auth.api.getSession({ headers: ctx.request.headers });
  return session?.user || null;
}

export async function requireAdminUser(ctx: { env: any; request: Request }) {
  if (ctx.env.DEV_USER_EMAIL) {
    console.warn(`AUTH BYPASS: Forcibly logging in as ${ctx.env.DEV_USER_EMAIL}`);

    const db = getDb(ctx.env);
    const devUser = await db.query.users.findFirst({
      where: eq(users.email, ctx.env.DEV_USER_EMAIL),
    });

    if (!devUser) {
      throw new Error(`DEV BYPASS FAILED: User ${ctx.env.DEV_USER_EMAIL} not found in DB.`);
    }

    if (devUser.isAdmin !== true) {
      throw new Error(`DEV BYPASS ERROR: User ${devUser.email} is not an admin.`);
    }

    return devUser;
  }

  const user = await requireUser(ctx);

  if (!user) {
    throw new Error("You must be logged in.");
  }

  if (user.isAdmin !== true) {
    throw new Error("You do not have permission to access this resource.");
  }

  return user;
}
