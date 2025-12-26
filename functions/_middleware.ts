export const onRequest: PagesFunction = async (ctx) => {
  try {
    return await ctx.next();
  } catch (err) {
    console.error("Unhandled Pages Function error", err);

    const pathname = new URL(ctx.request.url).pathname;
    if (pathname.startsWith("/api/")) {
      return new Response(JSON.stringify({ error: "Internal Server Error" }), {
        status: 500,
        headers: { "content-type": "application/json" },
      });
    }

    return new Response("Internal Server Error", { status: 500 });
  }
};
