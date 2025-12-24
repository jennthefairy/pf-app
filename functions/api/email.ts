import { json, bad } from "../util/responses";
export const onRequestPost: PagesFunction = async ({ request, env }) => {
  try {
    const { to, subject, html } = await request.json() as any;
    if (!to || !subject || !html) return bad("Missing to/subject/html");
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${(env as any).RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: "no-reply@pagefairy.me", to, subject, html })
    });
    const data = await res.json();
    return json(data, { status: res.ok ? 200 : 400 });
  } catch (e: any) {
    return bad(e?.message || "Email error");
  }
};
