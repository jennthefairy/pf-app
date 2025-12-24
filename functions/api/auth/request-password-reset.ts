import { json, bad } from "../../util/responses";
import { getDb } from "../../db/client";
import { users, passwordResetTokens } from "../../db/schema";
import { eq } from "drizzle-orm";

export const onRequestPost: PagesFunction = async (ctx) => {
  try {
    const { email } = await ctx.request.json() as any;
    
    if (!email) {
      return bad("Missing required field: email");
    }

    const db = getDb(ctx.env as any);
    
    // Check if user exists
    const userRows = await db.select().from(users).where(eq(users.email, email));
    
    // Always return success (don't leak user existence)
    if (userRows.length === 0) {
      return json({ ok: true, message: "If an account exists, a reset link was sent." });
    }

    const user = userRows[0];
    
    // Generate a secure reset token (valid for 1 hour)
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    
    // Store token in database
    await db.insert(passwordResetTokens).values({
      userId: user.id,
      token,
      expiresAt
    });
    
    const baseUrl = new URL(ctx.request.url).origin;
    const resetLink = `${baseUrl}/app/reset-password.html?token=${token}&email=${encodeURIComponent(email)}`;
    
    // Send email via Resend
    const emailBody = {
      from: "PageFairy <no-reply@pagefairy.me>",
      to: email,
      subject: "Reset Your Password - PageFairy",
      html: `
        <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #1e293b; margin-bottom: 24px;">Reset Your Password</h1>
          <p style="color: #475569; margin-bottom: 16px;">Hi ${user.name || 'there'},</p>
          <p style="color: #475569; margin-bottom: 24px;">
            We received a request to reset your password. Click the button below to create a new password:
          </p>
          <a href="${resetLink}" 
             style="display: inline-block; background: #ff7096; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 8px; font-weight: 600; margin-bottom: 24px;">
            Reset Password
          </a>
          <p style="color: #64748b; font-size: 14px; margin-top: 24px;">
            This link will expire in 1 hour. If you didn't request this, you can safely ignore this email.
          </p>
          <p style="color: #64748b; font-size: 14px; margin-top: 16px;">
            Or copy this link: <br/>
            <code style="background: #f1f5f9; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
              ${resetLink}
            </code>
          </p>
        </div>
      `
    };

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${(ctx.env as any).RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(emailBody)
    });

    if (!emailRes.ok) {
      console.error("Email send error:", await emailRes.text());
      // Still return success to not leak info
    }

    return json({ ok: true, message: "If an account exists, a reset link was sent." });
  } catch (e: any) {
    console.error("Password reset request error:", e);
    return json({ ok: true, message: "If an account exists, a reset link was sent." });
  }
};
