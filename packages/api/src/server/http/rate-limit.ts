import type { MiddlewareHandler } from "hono";

// The edge has no auth yet, so the client IP is the only anonymous key. Move to
// a user- or route-scoped key once authenticated traffic lands: a shared NAT or
// CGNAT IP must not throttle many real listeners at once.
export function rateLimitKey(ip: string | undefined): string {
  return ip ?? "unknown";
}

export function rateLimitingMiddleware(limiter: RateLimit): MiddlewareHandler {
  return async (context, next) => {
    const { success } = await limiter.limit({
      key: rateLimitKey(context.req.header("cf-connecting-ip")),
    });

    if (!success) {
      return context.text("too many requests", 429, { vary: "Origin" });
    }

    await next();
  };
}
