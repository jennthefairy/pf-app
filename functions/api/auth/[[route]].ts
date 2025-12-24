import { createAuth } from "../../util/auth";
export const onRequest: PagesFunction = async (ctx) => {
  const auth = createAuth(ctx.env as any);
  // Better-auth provides a single handler that routes internally
  return auth.handler(ctx.request);
};
