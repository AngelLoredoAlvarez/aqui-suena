// Email template renderer. renderEmail(id, locale, vars) -> { subject, html }.
// Variables must be pre-formatted; missing values throw instead of leaking placeholders.

import type {
  EmailLocale,
  EmailTemplateId,
  EmailTemplateVars,
  RenderedEmail,
} from "@aqui-suena/api/domain/email/email-template";
import en from "@aqui-suena/api/infrastructure/email/en.json";
import esMX from "@aqui-suena/api/infrastructure/email/es-MX.json";

type TemplateKey = "t1" | "t2" | "t3" | "t4" | "t5" | "t6" | "t7" | "t8" | "t9" | "t10" | "t11";

interface TemplateCopy {
  readonly s: string;
  readonly pre: string;
  readonly h: string;
  readonly p: readonly string[];
  readonly cta: string;
  readonly b?: string;
  readonly rows?: readonly string[];
  readonly r?: string;
  readonly list?: readonly string[];
  readonly lt?: string;
  readonly c2?: string;
}

interface CommonCopy {
  readonly tag: string;
  readonly help: string;
  readonly app: string;
  readonly bill: string;
  readonly fb: string;
  readonly hi: string;
  readonly per: string;
  readonly exp: string;
}

interface LocaleCopy extends Record<TemplateKey, TemplateCopy> {
  readonly c: CommonCopy;
}

const L: Record<EmailLocale, LocaleCopy> = {
  "es-MX": esMX,
  en,
};

interface TemplateMeta {
  readonly key: TemplateKey;
  readonly ctaUrl: string;
  readonly rows?: readonly string[];
  readonly secondaryUrl?: string;
}

const TEMPLATE_META: Record<EmailTemplateId, TemplateMeta> = {
  downgrade: { key: "t1", ctaUrl: "billingUrl" },
  "failed-renewal": { key: "t2", ctaUrl: "billingUrl" },
  "grace-expired": { key: "t3", ctaUrl: "billingUrl" },
  "renewal-7d": { key: "t4", ctaUrl: "billingUrl" },
  "renewal-1d": { key: "t5", ctaUrl: "billingUrl" },
  "verify-email": { key: "t6", ctaUrl: "verifyUrl" },
  receipt: {
    key: "t7",
    ctaUrl: "billingUrl",
    rows: ["planName", "period", "amount", "paidAt", "paymentId"],
  },
  "invoice-cfdi": {
    key: "t8",
    ctaUrl: "downloadUrl",
    rows: ["invoiceId", "issuedAt", "amount"],
    secondaryUrl: "billingUrl",
  },
  welcome: { key: "t9", ctaUrl: "ownerPortalUrl", secondaryUrl: "billingUrl" },
  cancellation: { key: "t10", ctaUrl: "billingUrl", secondaryUrl: "billingUrl" },
  "cancellation-immediate": { key: "t11", ctaUrl: "billingUrl", secondaryUrl: "billingUrl" },
};

const F = "-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif";

function value(vars: Record<string, string>, name: string): string {
  const found = vars[name];

  if (found === undefined) {
    throw new Error(`Missing email template variable: ${name}`);
  }

  return found;
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function interpolate(text: string, vars: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (_match, name: string) => value(vars, name));
}

export function renderEmail(
  id: EmailTemplateId,
  locale: EmailLocale,
  overrides: EmailTemplateVars = {},
): RenderedEmail {
  const meta = TEMPLATE_META[id];
  const t = L[locale][meta.key];
  const c = L[locale].c;
  const vars: Record<string, string> = { ...overrides };
  const f = (text: string) =>
    text.replace(/\{(\w+)\}/g, (_match, name: string) => escapeHtml(value(vars, name)));
  const rowLabels = t.rows ?? [];
  const rowKeys = meta.rows ?? [];
  const P = (text: string): string =>
    `<p style="margin:0 0 16px;font:16px/24px ${F};color:#1B2430">${f(text)}</p>`;
  const [intro, ...rest] = t.p;
  let b = intro === undefined ? "" : P(intro);

  if (t.b) b += P(t.b);

  if (rowLabels.length > 0) {
    b +=
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;border:1px solid #E3DDD2;border-radius:8px">` +
      rowLabels
        .map((label, j) => {
          const key = rowKeys[j];

          if (key === undefined) {
            throw new Error(`Missing summary row key for template: ${id}`);
          }

          return `<tr><td style="padding:10px 14px;font:14px/20px ${F};color:#566170;border-top:${j ? "1px solid #E3DDD2" : "0"}">${label}</td><td align="right" style="padding:10px 14px;font:600 14px/20px ${F};color:#1B2430;border-top:${j ? "1px solid #E3DDD2" : "0"}">${escapeHtml(value(vars, key))}</td></tr>`;
        })
        .join("") +
      `</table>`;
  }

  b += rest.map(P).join("");

  if (t.r) b += P(t.r);

  if (t.list) {
    b +=
      `<p style="margin:0 0 8px;font:600 15px/22px ${F};color:#1B2430">${t.lt ?? ""}</p><ul style="margin:0 0 20px;padding-left:20px;font:15px/24px ${F};color:#566170">` +
      t.list.map((item) => `<li>${item}</li>`).join("") +
      `</ul>`;
  }

  const url = escapeHtml(value(vars, meta.ctaUrl));
  const btn = `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 8px"><tr><td bgcolor="#C8431D" style="border-radius:8px"><a href="${url}" style="display:inline-block;padding:14px 28px;font:700 16px/20px ${F};color:#ffffff;text-decoration:none;border-radius:8px">${t.cta}</a></td></tr></table>`;
  const lk =
    meta.key === "t6"
      ? `<p style="margin:16px 0 0;font:13px/20px ${F};color:#566170">${c.fb}<br><a href="${url}" style="color:#C8431D;word-break:break-all">${url}</a></p>`
      : "";
  const l2 = meta.secondaryUrl
    ? `<p style="margin:12px 0 0;font:14px/20px ${F}"><a href="${escapeHtml(value(vars, meta.secondaryUrl))}" style="color:#C8431D">${t.c2 ?? ""}</a></p>`
    : "";
  const logo = `<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="padding-right:12px"><svg width="62" height="41" viewBox="180 295 664 430" role="img" aria-label="Aquí Suena"><g transform="translate(512 512) scale(0.78) translate(-512 -510)"><g fill="none" stroke="#FF8A65" stroke-linecap="round" stroke-width="40"><path d="M303.2 346.8 A265 265 0 0 0 303.2 673.2"/><path d="M720.8 346.8 A265 265 0 0 1 720.8 673.2"/><path d="M208.6 273 A385 385 0 0 0 208.6 747" stroke="#FFC4B3"/><path d="M815.4 273 A385 385 0 0 1 815.4 747" stroke="#FFC4B3"/></g><g transform="translate(512 510) scale(1.1) translate(-512 -510)"><path d="M400 300 H624 L672 400 a40 40 0 0 1 -80 0 a40 40 0 0 1 -80 0 a40 40 0 0 1 -80 0 a40 40 0 0 1 -80 0 Z" fill="#FF8A65"/><path fill-rule="evenodd" fill="#FF8A65" d="M404 475 H620 A24 24 0 0 1 644 499 V696 A24 24 0 0 1 620 720 H404 A24 24 0 0 1 380 696 V499 A24 24 0 0 1 404 475 Z M460 552 a18 18 0 0 1 18 18 v54 a18 18 0 0 1 -18 18 a18 18 0 0 1 -18 -18 v-54 a18 18 0 0 1 18 -18 Z M512 522 a18 18 0 0 1 18 18 v114 a18 18 0 0 1 -18 18 a18 18 0 0 1 -18 -18 v-114 a18 18 0 0 1 18 -18 Z M564 542 a18 18 0 0 1 18 18 v74 a18 18 0 0 1 -18 18 a18 18 0 0 1 -18 -18 v-74 a18 18 0 0 1 18 -18 Z"/></g></g></svg></td><td style="font:700 26px/32px 'Plus Jakarta Sans',${F};color:#F2F5F7">Aquí Suena</td></tr></table>`;

  return {
    subject: interpolate(t.s, vars),
    html: `<!DOCTYPE html><html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${f(t.s)}</title><link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@700&display=swap" rel="stylesheet"><style>@media(max-width:620px){.w{width:100%!important}.px{padding-left:20px!important;padding-right:20px!important}}</style></head><body style="margin:0;padding:0;background:#F6F3EE">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${f(t.pre)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#F6F3EE"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" class="w" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%">
<tr><td class="px" bgcolor="#0F1720" style="padding:22px 32px;border-radius:12px 12px 0 0">${logo}</td></tr>
<tr><td class="px" bgcolor="#ffffff" style="padding:32px">
<h1 style="margin:0 0 16px;font:700 24px/30px ${F};color:#1B2430">${f(t.h)}</h1>${b}${btn}${lk}${l2}</td></tr>
<tr><td class="px" bgcolor="#172230" style="padding:22px 32px;border-radius:0 0 12px 12px;font:13px/20px ${F};color:#A3B3C2">
<strong style="color:#F2F5F7">Aquí Suena</strong> · ${c.tag}<br>${c.help} <a href="mailto:${escapeHtml(value(vars, "supportEmail"))}" style="color:#FF8A65">${escapeHtml(value(vars, "supportEmail"))}</a><br>
<a href="${escapeHtml(value(vars, "appUrl"))}" style="color:#FF8A65">${c.app}</a> · <a href="${escapeHtml(value(vars, "billingUrl"))}" style="color:#FF8A65">${c.bill}</a>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:16px"><tr><td style="padding-right:10px"><svg width="40" height="40" viewBox="-4 -10 72 72" fill="none" role="img" aria-label="17 Labs"><path d="M24 6h16M26 6v20L10 54q-2 5 3 5h38q5 0 3-5L38 26V6" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M27 40l-8 8 8 8M37 40l8 8-8 8M34 39l-4 18" stroke="#14B8A6" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/><g stroke="#14B8A6" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" fill="none"><path d="M32.2 -8.5l1.6-1.1v5.2" opacity="0.4"/><ellipse cx="30.5" cy="-1" rx="1.5" ry="2.2" opacity="0.7"/><ellipse cx="33.5" cy="12.2" rx="1.5" ry="2.2"/><path d="M29.2 16.3l1.6-1.1v5.2"/><ellipse cx="33.5" cy="23.4" rx="1.5" ry="2.2"/><path d="M29.2 27.5l1.6-1.1v5.2"/><ellipse cx="33.5" cy="34.6" rx="1.5" ry="2.2"/></g></svg></td><td style="font:500 13px/16px ui-monospace,Menlo,Consolas,monospace;color:#A3B3C2">by <b style="color:#ffffff;font-weight:800">17</b><span style="color:#5EEAD4">Labs</span></td></tr></table></td></tr>
</table></td></tr></table></body></html>`,
  };
}
