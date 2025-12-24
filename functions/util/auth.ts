import { betterAuth } from "better-auth";
import { getDb } from "../db/client";
import { users, sessions } from "../db/schema";
import * as schema from "../db/schema";
import { eq } from "drizzle-orm";



export function createAuth(env: any) {
  const db = getDb(env);
  const adapter = {
    async getUserByEmail(email: string) {
      const rows = await db.select().from(users).where(eq(users.email, email));
      return rows[0] || null;
    },
    async createUser(data: { email: string; name?: string | null }) {
      const [row] = await db.insert(users).values({ email: data.email, name: data.name ?? null }).returning();
      return row;
    },
    async createSession(data: { userId: number; token: string; expiresAt: Date }) {
      await db.insert(sessions).values({ userId: data.userId, token: data.token, expiresAt: data.expiresAt });
      return true;
    },
    async getSession(token: string) {
      const rows = await db.select().from(sessions).where(eq(sessions.token, token));
      return rows[0] || null;
    },
    async deleteSession(token: string) {
      await db.delete(sessions).where(eq(sessions.token, token));
      return true;
    }
  };
  return betterAuth({
    secret: env.BETTER_AUTH_SECRET,
    cookies: { secure: String(env.BETTER_AUTH_SECURE_COOKIES) === "true", sameSite: "lax", httpOnly: true },
    // FIX: Corrected `adapters` (plural) to `adapter` (singular)
    adapter: adapter
  });
}
export async function requireUser(ctx: any) {
  // --- DEV BYPASS ---
  if (ctx.env.DEV_USER_EMAIL) {
    console.warn(`AUTH BYPASS: Forcibly logging in as ${ctx.env.DEV_USER_EMAIL}`);
    const db = getDb(ctx.env);
    const devUser = await db.query.users.findFirst({
      where: eq(schema.users.email, ctx.env.DEV_USER_EMAIL)
    });
    if (devUser) return devUser;
    console.error(`DEV BYPASS FAILED: User ${ctx.env.DEV_USER_EMAIL} not found in DB.`);
    // Fall through to real auth
  }
  // --- END BYPASS ---
  
  // Real auth
  // Attempt simple token-based auth (fallback when not using better-auth helpers)
  const db = getDb(ctx.env);
  const authHeader = ctx.request.headers.get('authorization') || "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.substring(7) : "";
  let token = bearer;

  if (!token) {
    const cookieHeader = ctx.request.headers.get('cookie') || "";
    const cookies: Record<string, string> = Object.fromEntries(
      cookieHeader.split(/;\s*/).filter(Boolean).map((c: string) => {
        const idx = c.indexOf('=');
        return idx === -1 ? [c, ""] : [decodeURIComponent(c.slice(0, idx)), decodeURIComponent(c.slice(idx + 1))];
      })
    );
    const possibleNames = ["better-auth.session", "auth_token", "session", "pf_session"];
    for (const name of possibleNames) {
      if (cookies[name]) { token = cookies[name]; break; }
    }
  }

  if (!token) return null;

  const sess = await db.select().from(sessions).where(eq(sessions.token, token));
  const sessionRow = sess[0];
  if (!sessionRow) return null;
  const userRows = await db.select().from(users).where(eq(users.id, sessionRow.userId));
  return userRows[0] || null;
}

/**
 * --- UPDATED ---
 * Helper to get the current user, or throw an error if not logged in or not an admin.
 * Now includes a dev bypass.
 */
export async function requireAdminUser(ctx: any) {
  // --- DEV BYPASS ---
  if (ctx.env.DEV_USER_EMAIL) {
    console.warn(`AUTH BYPASS: Forcibly logging in as ${ctx.env.DEV_USER_EMAIL}`);
    const db = getDb(ctx.env);
    const devUser = await db.query.users.findFirst({
      where: eq(schema.users.email, ctx.env.DEV_USER_EMAIL)
    });
    
    if (devUser) {
      // Still check if the bypass user is *actually* an admin
      if (devUser.isAdmin !== true) {
        throw new Error(`DEV BYPASS ERROR: User ${devUser.email} is not an admin.`);
      }
      return devUser; // Bypass successful
    }
    
    console.error(`DEV BYPASS FAILED: User ${ctx.env.DEV_USER_EMAIL} not found in DB.`);
    // Fall through to real auth
  }
  // --- END BYPASS ---
  
  // Real auth
  const user = await requireUser(ctx); // Will use the real requireUser
  
  if (!user) {
    throw new Error("You must be logged in.");
  }
  
  if (user.isAdmin !== true) {
    throw new Error("You do not have permission to access this resource.");
  }
  
  return user;
}