export interface WorkerEnv {
  ALLOWED_ORIGINS?: string;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  SUPABASE_PUBLISHABLE_KEY?: string;
  SUPABASE_SECRET_KEY?: string;
  SUPABASE_JWKS_URL?: string;
  aqui_suena_db: D1Database;
  AI: Ai;
  /** Set when the [[vectorize]] binding is enabled in wrangler.toml. */
  PLAN_VECTORS?: VectorizeIndex;
  /** Optional AI Gateway id; when set, Workers AI calls route through it. */
  AI_GATEWAY_ID?: string;
  /** Required to call POST /admin/seed-vectors. */
  ADMIN_TOKEN?: string;
  /** Cloudflare [[ratelimits]] binding; caps requests per client IP. */
  RATE_LIMITER?: RateLimit;
  /**
   * Base URL that serves the owned harness files (`/test-streams/*.m4a`).
   * Required by POST /admin/seed-stations so a dev localhost URL is never
   * written to a deployed database.
   */
  STREAM_BASE_URL?: string;
  /**
   * R2 (S3-compatible) credentials for media storage. When all three are
   * absent media is reported as unconfigured; a partial set is a configuration
   * error (logged, still unconfigured). The Worker never uses a fake.
   */
  R2_ACCOUNT_ID?: string;
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
  R2_BUCKET_NAME?: string;
  R2_ENDPOINT?: string;
  RESEND_API_KEY?: string;
  RESEND_FROM?: string;
  /** Origin every transactional-email link points at. */
  EMAIL_APP_URL?: string;
  /** Support address in the email footer; defaults to the sender. */
  EMAIL_SUPPORT_ADDRESS?: string;
  /** Facturama sandbox/production credentials and emitter fiscal settings. */
  FACTURAMA_USER?: string;
  FACTURAMA_PASSWORD?: string;
  FACTURAMA_BASE_URL?: string;
  FACTURAMA_MODE?: string;
  FACTURAMA_EXPEDITION_PLACE?: string;
  FACTURAMA_IVA_RATE?: string;
  FACTURAMA_PRODUCT_CODE?: string;
  FACTURAMA_UNIT_CODE?: string;
  FACTURAMA_SERIES?: string;
  FACTURAMA_ISSUER_RFC?: string;
  FACTURAMA_ISSUER_NAME?: string;
  FACTURAMA_ISSUER_FISCAL_REGIME?: string;
  CONEKTA_PRIVATE_KEY?: string;
  CONEKTA_PUBLIC_KEY?: string;
  CONEKTA_WEBHOOK_PUBLIC_KEY?: string;
  CONEKTA_BASE_URL?: string;
  CONEKTA_LIVEMODE?: string;
}
