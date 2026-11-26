import type { Account } from "@aqui-suena/api/domain/accounts/account";
import type { Payment } from "@aqui-suena/api/domain/billing/payments/model/payment";
import { PaymentNotifications } from "@aqui-suena/api/domain/billing/payments/use-cases/payment-notifications";
import { plans as planFixtures } from "@aqui-suena/api/domain/billing/subscriptions/fixtures";
import { InMemoryAccountRepository } from "@aqui-suena/api/infrastructure/memory/in-memory-account-repository";
import { InMemoryPaymentRepository } from "@aqui-suena/api/infrastructure/memory/in-memory-payment-repository";
import { InMemoryPlanRepository } from "@aqui-suena/api/infrastructure/memory/in-memory-plan-repository";
import { FakePaymentNotifier } from "@aqui-suena/api/testing/notifiers";
import { describe, expect, it, vi } from "vitest";

const NOW = new Date("2026-11-19T12:00:00Z");

function account(overrides: Partial<Account> = {}): Account {
  return {
    id: "acc-1",
    email: "owner@example.com",
    planId: "trades",
    locale: "es-MX",
    deletedAt: null,
    ...overrides,
  };
}

function payment(overrides: Partial<Payment> = {}): Payment {
  return {
    id: "pay-1",
    accountId: "acc-1",
    subscriptionId: null,
    planId: "trades",
    billingInterval: "monthly",
    method: "card",
    provider: "conekta",
    providerOrderId: null,
    providerChargeId: null,
    idempotencyKey: "idem-1",
    amount: 9900,
    currency: "MXN",
    status: "completed",
    reference: null,
    nextActionUrl: null,
    expiresAt: null,
    failureReason: null,
    periodStart: null,
    periodEnd: null,
    paidAt: NOW,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

interface SetupOptions {
  accountRows?: Account[];
  plans?: typeof planFixtures;
  paymentRows?: Payment[];
  notifier?: FakePaymentNotifier;
  onDeliveryError?: (error: unknown, stage: "receipt" | "pending", paymentId: string) => void;
  withAccounts?: boolean;
  withNotifier?: boolean;
}

function setup(options: SetupOptions = {}) {
  const payments = new InMemoryPaymentRepository(options.paymentRows ?? []);
  const plans = new InMemoryPlanRepository(options.plans ?? planFixtures);
  const accounts = new InMemoryAccountRepository(options.accountRows ?? [account()]);
  const notifier = options.notifier ?? new FakePaymentNotifier();

  const notifications = new PaymentNotifications({
    payments,
    plans,
    accounts: options.withAccounts === false ? undefined : accounts,
    notifier: options.withNotifier === false ? undefined : notifier,
    onDeliveryError: options.onDeliveryError,
    now: () => NOW,
  });

  return { payments, notifier, notifications };
}

describe("PaymentNotifications", () => {
  describe("receipt", () => {
    it("does nothing when accounts are not wired", async () => {
      const { notifier, notifications } = setup({ withAccounts: false });

      await notifications.receipt(payment());

      expect(notifier.calls).toHaveLength(0);
    });

    it("does nothing when no notifier is wired", async () => {
      const { notifications } = setup({ withNotifier: false });

      await expect(notifications.receipt(payment())).resolves.toBeUndefined();
    });

    it("skips a missing account", async () => {
      const { notifier, notifications } = setup({ accountRows: [] });

      await notifications.receipt(payment());

      expect(notifier.calls).toHaveLength(0);
    });

    it("skips a deleted account", async () => {
      const { notifier, notifications } = setup({
        accountRows: [account({ deletedAt: NOW })],
      });

      await notifications.receipt(payment());

      expect(notifier.calls).toHaveLength(0);
    });

    it("sends a receipt with the plan name", async () => {
      const { notifier, notifications } = setup();

      await notifications.receipt(payment());

      expect(notifier.calls).toHaveLength(1);
      expect(notifier.calls[0]).toMatchObject({
        event: "payment-receipt",
        recipient: { email: "owner@example.com", locale: "es-MX" },
        data: {
          paymentId: "pay-1",
          planName: "Oficios & Servicios",
          amountMinorUnits: 9900,
          currency: "MXN",
          method: "card",
          paidAt: NOW,
        },
      });
    });

    it("falls back to the plan id when the plan is not found", async () => {
      const { notifier, notifications } = setup({ plans: [] });

      await notifications.receipt(payment());

      expect(notifier.calls[0]?.data.planName).toBe("trades");
    });

    it("falls back to a generic label when the payment has no plan", async () => {
      const { notifier, notifications } = setup();

      await notifications.receipt(payment({ planId: null }));

      expect(notifier.calls[0]?.data.planName).toBe("Plan");
    });

    it("uses the current date when the payment has no paidAt", async () => {
      const { notifier, notifications } = setup();

      await notifications.receipt(payment({ paidAt: null }));

      expect(notifier.calls[0]).toMatchObject({
        event: "payment-receipt",
        data: { paidAt: NOW },
      });
    });

    it("routes a delivery error to onDeliveryError and does not fail", async () => {
      const onDeliveryError = vi.fn();
      const { notifications } = setup({
        notifier: new FakePaymentNotifier(new Error("send failed")),
        onDeliveryError,
      });

      await expect(notifications.receipt(payment())).resolves.toBeUndefined();

      expect(onDeliveryError).toHaveBeenCalledWith(expect.any(Error), "receipt", "pay-1");
    });
  });

  describe("pending", () => {
    it("does nothing for a missing payment", async () => {
      const { notifier, notifications } = setup();

      await notifications.pending("nope");

      expect(notifier.calls).toHaveLength(0);
    });

    it("does nothing when the payment has neither reference nor action url", async () => {
      const { notifier, notifications } = setup({ paymentRows: [payment()] });

      await notifications.pending("pay-1");

      expect(notifier.calls).toHaveLength(0);
    });

    it("sends a pending email with the reference and expiry", async () => {
      const { notifier, notifications } = setup({
        paymentRows: [
          payment({ reference: "ref-1", nextActionUrl: null, expiresAt: NOW, status: "pending" }),
        ],
      });

      await notifications.pending("pay-1");

      expect(notifier.calls).toHaveLength(1);
      expect(notifier.calls[0]).toMatchObject({
        event: "payment-pending",
        data: {
          paymentId: "pay-1",
          reference: "ref-1",
          expiresAt: NOW,
          nextActionUrl: null,
        },
      });
    });

    it("routes a delivery error to onDeliveryError without failing", async () => {
      const onDeliveryError = vi.fn();
      const { notifications } = setup({
        notifier: new FakePaymentNotifier(new Error("send failed")),
        onDeliveryError,
        paymentRows: [payment({ reference: "ref-1" })],
      });

      await expect(notifications.pending("pay-1")).resolves.toBeUndefined();

      expect(onDeliveryError).toHaveBeenCalledWith(expect.any(Error), "pending", "pay-1");
    });
  });
});
