import { TemplateCfdiNotifier } from "@aqui-suena/api/domain/billing/invoices/ports/template-cfdi-notifier";
import { TemplateSubscriptionNotifier } from "@aqui-suena/api/domain/billing/subscriptions/ports/template-subscription-notifier";
import {
  createCfdiNotifier,
  createSubscriptionNotifier,
  emailBillingUrl,
} from "@aqui-suena/api/server/composition/email";
import { describe, expect, it } from "vitest";

const settings = {
  apiKey: "re_test_key",
  from: "onboarding@resend.dev",
  appUrl: "https://aqui-suena-web-staging.pages.dev",
};

describe("createSubscriptionNotifier", () => {
  it("returns undefined when no Resend API key is configured", () => {
    expect(createSubscriptionNotifier({ ...settings, apiKey: undefined })).toBeUndefined();
  });

  it("returns undefined when the API key is empty", () => {
    expect(createSubscriptionNotifier({ ...settings, apiKey: "" })).toBeUndefined();
  });

  it("builds a subscription notifier over Resend when a key is configured", () => {
    expect(createSubscriptionNotifier(settings)).toBeInstanceOf(TemplateSubscriptionNotifier);
  });
});

describe("createCfdiNotifier", () => {
  it("returns undefined when no Resend API key is configured", () => {
    expect(createCfdiNotifier({ ...settings, apiKey: undefined })).toBeUndefined();
  });

  it("builds a CFDI notifier over Resend when a key is configured", () => {
    expect(createCfdiNotifier(settings)).toBeInstanceOf(TemplateCfdiNotifier);
  });
});

describe("emailBillingUrl", () => {
  it("builds the billing link from the configured app origin", () => {
    expect(emailBillingUrl("https://aqui-suena-web-staging.pages.dev")).toBe(
      "https://aqui-suena-web-staging.pages.dev/cuenta/suscripcion",
    );
  });

  it("falls back to a local origin instead of an unowned domain", () => {
    expect(emailBillingUrl(undefined)).toBe("http://localhost:3000/cuenta/suscripcion");
  });
});
