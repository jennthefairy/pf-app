import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { getDb } from "../db/client";
import * as schema from "../db/schema";
import { eq } from "drizzle-orm";
export function createAuth(env: any) {
  const db = getDb(env);
  return betterAuth({
    secret: env.BETTER_AUTH_SECRET,
    cookies: { secure: String(env.BETTER_AUTH_SECURE_COOKIES) === "true", sameSite: "lax", httpOnly: true },
    advanced: {
      database: {
        // This project uses serial integer IDs. Better Auth will expose them as strings.
        useNumberId: true,
      },
    },
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        users: schema.users,
        sessions: schema.sessions,
        accounts: schema.accounts,
        verifications: schema.verifications,
      },
    }),
    user: {
      modelName: "users",
      fields: {
        emailVerified: "email_verified",
        createdAt: "created_at",
        updatedAt: "updated_at",
      },
      additionalFields: {
        isAdmin: {
          type: "boolean",
          fieldName: "is_admin",
          required: true,
          defaultValue: false,
        },
      },
    },
    session: {
      modelName: "sessions",
      fields: {
        userId: "user_id",
        expiresAt: "expires_at",
        ipAddress: "ip_address",
        userAgent: "user_agent",
        createdAt: "created_at",
        updatedAt: "updated_at",
      },
    },
    account: {
      modelName: "accounts",
      fields: {
        userId: "user_id",
        providerId: "provider_id",
        accountId: "account_id",
        accessToken: "access_token",
        refreshToken: "refresh_token",
        idToken: "id_token",
        accessTokenExpiresAt: "access_token_expires_at",
        refreshTokenExpiresAt: "refresh_token_expires_at",
        scope: "scope",
        password: "password",
        createdAt: "created_at",
        updatedAt: "updated_at",
      },
    },
    verification: {
      modelName: "verifications",
      fields: {
        identifier: "identifier",
        value: "value",
        expiresAt: "expires_at",
        createdAt: "created_at",
        updatedAt: "updated_at",
      },
    },
    emailAndPassword: {
      enabled: true,
      sendResetPassword: async ({ user, url }) => {
        try {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${String(env.RESEND_API_KEY || "")}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "PageFairy <no-reply@pagefairy.me>",
              to: user.email,
              subject: "Reset Your Password - PageFairy",
              html: `\n                <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">\n                  <h1 style="color: #1e293b; margin-bottom: 24px;">Reset Your Password</h1>\n                  <p style="color: #475569; margin-bottom: 24px;">Click the link below to set a new password:</p>\n                  <a href="${url}"\n                     style="display: inline-block; background: #ff7096; color: white; padding: 12px 24px;\n                            text-decoration: none; border-radius: 8px; font-weight: 600;">\n                    Reset Password\n                  </a>\n                  <p style="color: #64748b; font-size: 14px; margin-top: 24px;">\n                    If you didn't request this, you can ignore this email.\n                  </p>\n                </div>\n              `,
            }),
          });
        } catch (e) {
          console.error("sendResetPassword error", e);
        }
      },
    },
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

  // Real auth: rely on Better Auth session cookies.
  const auth = createAuth(ctx.env as any);
  const session = await auth.api.getSession({
    headers: ctx.request.headers,
  });

  if (!session?.user) return null;

  // This project uses serial integer IDs in Postgres. Better Auth exposes IDs as strings.
  const rawId = (session.user as any).id;
  const id = typeof rawId === "string" ? Number(rawId) : rawId;
  if (!Number.isFinite(id)) return null;

  return { ...(session.user as any), id };
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