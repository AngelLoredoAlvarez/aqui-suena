// Email template renderer. renderEmail(id, locale, vars) -> { subject, html }.
// Variables must be pre-formatted; missing values throw instead of leaking placeholders.

import type {
  EmailLocale,
  EmailTemplateId,
  EmailTemplateVars,
  RenderedEmail,
} from "@aqui-suena/api/domain/email/email-template";

type TemplateKey = "t1" | "t2" | "t3" | "t4" | "t5" | "t6" | "t7" | "t8" | "t9" | "t10";

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
  "es-MX": {
    c: {
      tag: "Radio abierta + directorio local",
      help: "¿Necesitas ayuda?",
      app: "Abrir Aquí Suena",
      bill: "Mi suscripción",
      fb: "Si el botón no funciona, copia y pega este enlace:",
      hi: "Hola",
      per: "Mensual",
      exp: "24 horas",
    },
    t1: {
      s: "Tu plan ha sido degradado",
      pre: "Tu plan ahora es {planName}.",
      h: "Tu plan ha sido degradado",
      p: [
        "Tu plan ha sido degradado a {planName}.",
        "Si tenías negocios en exceso, se ocultaron pero se conservan por 90 días.",
        "Puedes volver a subir de plan en cualquier momento para restaurar el acceso completo.",
      ],
      cta: "Gestionar mi suscripción",
    },
    t2: {
      s: "Tu pago falló — periodo de gracia de 7 días",
      pre: "Tienes hasta el {graceEnd} para regularizar tu pago.",
      h: "No pudimos procesar tu pago",
      p: [
        "Tu pago recurrente no se pudo procesar.",
        "Tienes hasta el {graceEnd} para regularizar tu pago. Después de esa fecha, tu plan se degradará automáticamente al plan Comunidad.",
        "Si crees que es un error, contacta a soporte.",
      ],
      cta: "Actualizar método de pago",
    },
    t3: {
      s: "Tu plan ha sido degradado",
      pre: "Tu periodo de gracia expiró.",
      h: "Tu plan ha sido degradado",
      p: [
        "Tu plan ha sido degradado a {planName}.",
        "Tu periodo de gracia expiró. Si tenías negocios en exceso, se ocultaron pero se conservan por 90 días.",
        "Puedes volver a subir de plan en cualquier momento para restaurar el acceso completo.",
      ],
      cta: "Ver planes",
    },
    t4: {
      s: "Tu plan se renueva en 7 días",
      pre: "Tu plan se renueva el {renewalDate}.",
      h: "Tu plan se renueva en 7 días",
      p: [
        "Tu plan se renueva el {renewalDate}. Si necesitas hacer cambios, puedes gestionar tu suscripción antes de esa fecha.",
      ],
      cta: "Gestionar mi suscripción",
    },
    t5: {
      s: "Tu plan se renueva mañana",
      pre: "Renovación: {renewalDate}.",
      h: "Tu plan se renueva mañana",
      p: [
        "Tu plan se renueva mañana ({renewalDate}). Asegúrate de tener tu método de pago al día.",
      ],
      cta: "Ver mi suscripción",
    },
    t6: {
      s: "Verifica tu correo electrónico",
      pre: "Activa tu cuenta para publicar tu negocio.",
      h: "Verifica tu correo electrónico",
      p: [
        "Bienvenido a Aquí Suena. Para activar tu cuenta y publicar tu negocio, verifica tu correo electrónico.",
        "Este enlace expira en {expiresIn}.",
        "Si no creaste esta cuenta, puedes ignorar este mensaje.",
      ],
      cta: "Verificar correo",
    },
    t7: {
      s: "Tu recibo de pago — Aquí Suena",
      pre: "Recibo por {amount}.",
      h: "Recibo de pago",
      p: ["Gracias por tu pago.", "Puedes ver tu historial de pagos en tu cuenta."],
      rows: ["Plan", "Periodo", "Monto", "Fecha", "ID de pago"],
      cta: "Ver mi suscripción",
    },
    t8: {
      s: "Tu factura fiscal (CFDI) está lista",
      pre: "Descarga tu CFDI de {planName}.",
      h: "Tu factura fiscal (CFDI) está lista",
      p: [
        "Tu factura fiscal (CFDI) por el pago de {planName} ya está disponible.",
        "Descárgala para tus registros fiscales.",
        "Si los datos fiscales (RFC, razón social) son incorrectos, contacta a soporte antes de usarla.",
      ],
      rows: ["Folio", "Fecha de emisión", "Monto"],
      cta: "Descargar factura",
      c2: "Ver mi cuenta",
    },
    t9: {
      s: "Bienvenido a Aquí Suena",
      pre: "Tu cuenta está lista.",
      h: "¡Bienvenido a Aquí Suena!",
      p: [
        "Bienvenido a Aquí Suena. Tu cuenta está lista.",
        "Tu plan actual es Comunidad (gratis). Puedes subir de plan cuando quieras para más visibilidad.",
        "Gestiona todo desde tu panel de propietario.",
      ],
      b: "Tu negocio {businessName} ya está en el directorio.",
      r: "Según tu perfil, te recomendamos el plan {recommendedPlan}.",
      lt: "Completa tu perfil (opcional, a tu ritmo):",
      list: [
        "Nombre y categoría del negocio",
        "Teléfono / WhatsApp",
        "Dirección y horarios",
        "Flyer",
        "Estado abierto / cerrado",
        "Pasos de tu plan: servicios, galería o catálogo",
      ],
      cta: "Ir a mi panel",
      c2: "Ver planes",
    },
    t10: {
      s: "Tu cancelación ha sido confirmada",
      pre: "Tu plan sigue activo hasta el {activeUntil}.",
      h: "Cancelación confirmada",
      p: [
        "Tu suscripción al plan {planName} ha sido cancelada.",
        "Tu plan se mantendrá activo hasta el {activeUntil}; después de esa fecha pasarás automáticamente al plan Comunidad.",
        "No se realizan reembolsos parciales por tiempo no utilizado.",
        "Puedes volver a suscribirte en cualquier momento.",
      ],
      cta: "Ver mi suscripción",
      c2: "Ver planes",
    },
  },
  en: {
    c: {
      tag: "Open radio + local directory",
      help: "Need help?",
      app: "Open Aquí Suena",
      bill: "My subscription",
      fb: "If the button doesn't work, copy and paste this link:",
      hi: "Hi",
      per: "Monthly",
      exp: "24 hours",
    },
    t1: {
      s: "Your plan has been downgraded",
      pre: "Your plan is now {planName}.",
      h: "Your plan has been downgraded",
      p: [
        "Your plan has been downgraded to {planName}.",
        "If you had excess businesses, they were hidden but are kept for 90 days.",
        "You can upgrade again at any time to restore full access.",
      ],
      cta: "Manage my subscription",
    },
    t2: {
      s: "Your payment failed — 7-day grace period",
      pre: "You have until {graceEnd} to update your payment.",
      h: "We couldn't process your payment",
      p: [
        "Your recurring payment could not be processed.",
        "You have until {graceEnd} to update your payment. After that date, your plan will be automatically downgraded to the Comunidad plan.",
        "If you think this is an error, contact support.",
      ],
      cta: "Update payment method",
    },
    t3: {
      s: "Your plan has been downgraded",
      pre: "Your grace period expired.",
      h: "Your plan has been downgraded",
      p: [
        "Your plan has been downgraded to {planName}.",
        "Your grace period expired. If you had excess businesses, they were hidden but are kept for 90 days.",
        "You can upgrade again at any time to restore full access.",
      ],
      cta: "View plans",
    },
    t4: {
      s: "Your plan renews in 7 days",
      pre: "Your plan renews on {renewalDate}.",
      h: "Your plan renews in 7 days",
      p: [
        "Your plan renews on {renewalDate}. If you need to make changes, you can manage your subscription before that date.",
      ],
      cta: "Manage my subscription",
    },
    t5: {
      s: "Your plan renews tomorrow",
      pre: "Renewal date: {renewalDate}.",
      h: "Your plan renews tomorrow",
      p: [
        "Your plan renews tomorrow ({renewalDate}). Make sure your payment method is up to date.",
      ],
      cta: "View my subscription",
    },
    t6: {
      s: "Verify your email address",
      pre: "Activate your account to publish your business.",
      h: "Verify your email address",
      p: [
        "Welcome to Aquí Suena. To activate your account and publish your business, verify your email address.",
        "This link expires in {expiresIn}.",
        "If you didn't create this account, you can ignore this message.",
      ],
      cta: "Verify email",
    },
    t7: {
      s: "Your payment receipt — Aquí Suena",
      pre: "Receipt for {amount}.",
      h: "Payment receipt",
      p: ["Thank you for your payment.", "You can view your payment history in your account."],
      rows: ["Plan", "Period", "Amount", "Date", "Payment ID"],
      cta: "View my subscription",
    },
    t8: {
      s: "Your tax invoice (CFDI) is ready",
      pre: "Download your {planName} CFDI.",
      h: "Your tax invoice (CFDI) is ready",
      p: [
        "Your tax invoice (CFDI) for the {planName} payment is now available.",
        "Download it for your tax records.",
        "If the tax details (RFC, business name) are incorrect, contact support before using it.",
      ],
      rows: ["Invoice ID", "Issue date", "Amount"],
      cta: "Download invoice",
      c2: "View my account",
    },
    t9: {
      s: "Welcome to Aquí Suena",
      pre: "Your account is ready.",
      h: "Welcome to Aquí Suena!",
      p: [
        "Welcome to Aquí Suena. Your account is ready.",
        "Your current plan is Comunidad (free). You can upgrade anytime for more visibility.",
        "Manage everything from your owner portal.",
      ],
      b: "Your business {businessName} is now in the directory.",
      r: "Based on your profile, we recommend the {recommendedPlan} plan.",
      lt: "Complete your profile (optional, at your own pace):",
      list: [
        "Business name and category",
        "Phone / WhatsApp",
        "Address and hours",
        "Flyer",
        "Open / closed status",
        "Plan steps: services, gallery or catalog",
      ],
      cta: "Go to my dashboard",
      c2: "View plans",
    },
    t10: {
      s: "Your cancellation has been confirmed",
      pre: "Your plan stays active until {activeUntil}.",
      h: "Cancellation confirmed",
      p: [
        "Your {planName} subscription has been cancelled.",
        "Your plan stays active until {activeUntil}; after that date you'll automatically move to the Comunidad plan.",
        "No partial refunds are issued for unused time.",
        "You can resubscribe at any time.",
      ],
      cta: "View my subscription",
      c2: "View plans",
    },
  },
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
