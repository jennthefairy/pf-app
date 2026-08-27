import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { getDb } from "../db/client";
import { eq } from "drizzle-orm";

export function createAuth(env: any) {
  const db = getDb(env);
  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "pg", // Using Neon/PostgreSQL
      usePlural: false,
    }),
    secret: env.BETTER_AUTH_SECRET,
    
  });
}

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
