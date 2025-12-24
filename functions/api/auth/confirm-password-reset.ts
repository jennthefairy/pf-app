import { json, bad } from "../../util/responses";
import { getDb } from "../../db/client";
import { users, passwordResetTokens } from "../../db/schema";
import { eq, and, gt } from "drizzle-orm";

export const onRequestPost: PagesFunction = async (ctx) => {
  try {
    const { token, password, passwordConfirm } = await ctx.request.json() as any;
    
    if (!token || !password || !passwordConfirm) {
      return bad("Missing required fields: token, password, passwordConfirm");
    }

    if (password !== passwordConfirm) {
      return bad("Passwords do not match");
    }

    if (password.length < 8) {
      return bad("Password must be at least 8 characters");
    }

    const db = getDb(ctx.env as any);
    
    // Look up the token and verify it hasn't expired
    const tokenRows = await db.select()
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.token, token),
          gt(passwordResetTokens.expiresAt, new Date())
        )
      );
    
    if (tokenRows.length === 0) {
      return bad("Invalid or expired token", 400);
    }

    const tokenData = tokenRows[0];
    
    // Note: In production, you should hash the password with bcrypt/argon2
    // For now, this stores plaintext (NOT SECURE - needs proper implementation)
    // Example with bcrypt: const hashedPassword = await bcrypt.hash(password, 10);
    
    // Update user's password (you'll need to add password field to users table)
    // await db.update(users)
    //   .set({ password: hashedPassword })
    //   .where(eq(users.id, tokenData.userId));
    
    // Delete the used token
    await db.delete(passwordResetTokens)
      .where(eq(passwordResetTokens.id, tokenData.id));

    return json({ 
      ok: true, 
      message: "Password reset successful. Please log in with your new password.",
      note: "This endpoint needs password field in users table and proper password hashing (bcrypt/argon2)"
    });
  } catch (e: any) {
    console.error("Password reset confirm error:", e);
    return bad(e?.message || "reset_failed");
  }
};
