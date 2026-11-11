import { TemplateSubscriptionNotifier } from "@aqui-suena/api/domain/billing/subscriptions/template-subscription-notifier";
import { createSubscriptionNotifier } from "@aqui-suena/api/server/composition/email";
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
