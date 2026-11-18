import { TemplateCfdiNotifier } from "@aqui-suena/api/domain/billing/invoices/template-cfdi-notifier";
import { TemplateSubscriptionNotifier } from "@aqui-suena/api/domain/billing/subscriptions/template-subscription-notifier";
import {
  createCfdiNotifier,
  createSubscriptionNotifier,
  EMAIL_BILLING_URL,
} from "@aqui-suena/api/server/composition/email";
import { describe, expect, it } from "vitest";

describe("createSubscriptionNotifier", () => {
  it("returns undefined when no Resend API key is configured", () => {
    expect(createSubscriptionNotifier(undefined, "no-reply@example.com")).toBeUndefined();
  });

  it("returns undefined when the API key is empty", () => {
    expect(createSubscriptionNotifier("", "no-reply@example.com")).toBeUndefined();
  });

  it("builds a subscription notifier over Resend when a key is configured", () => {
    const notifier = createSubscriptionNotifier("re_test_key", "no-reply@example.com");
    expect(notifier).toBeInstanceOf(TemplateSubscriptionNotifier);
  });
});

describe("createCfdiNotifier", () => {
  it("returns undefined when no Resend API key is configured", () => {
    expect(createCfdiNotifier(undefined, "no-reply@example.com")).toBeUndefined();
  });

  it("builds a CFDI notifier over Resend when a key is configured", () => {
    const notifier = createCfdiNotifier("re_test_key", "no-reply@example.com");
    expect(notifier).toBeInstanceOf(TemplateCfdiNotifier);
  });
});

describe("EMAIL_BILLING_URL", () => {
  it("points at the billing page used by every billing email", () => {
    expect(EMAIL_BILLING_URL).toBe("https://aquisuena.mx/cuenta/suscripcion");
  });
});
