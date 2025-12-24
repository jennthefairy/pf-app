export const onRequest: PagesFunction = async (ctx) => {
  // Add security headers or route gating here if needed
  return ctx.next();
};
