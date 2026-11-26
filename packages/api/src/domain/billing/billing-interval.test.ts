import {
  BILLING_INTERVALS,
  parseBillingInterval,
} from "@aqui-suena/api/domain/billing/billing-interval";
import { DataIntegrityError } from "@aqui-suena/api/shared/domain-error";
import { describe, expect, it } from "vitest";

describe("parseBillingInterval", () => {
  it.each(BILLING_INTERVALS)("accepts the valid interval %s", (interval) => {
    expect(parseBillingInterval(interval)).toBe(interval);
  });

  it.each(["weekly", "", "MONTHLY", " monthly"])("rejects the unknown string %s", (value) => {
    expect(() => parseBillingInterval(value)).toThrow(DataIntegrityError);
  });

  it.each([null, undefined, 3, {}])("rejects the non-string value %s", (value) => {
    expect(() => parseBillingInterval(value)).toThrow(DataIntegrityError);
  });

  it("rejects an array value", () => {
    expect(() => parseBillingInterval(["monthly"])).toThrow(DataIntegrityError);
  });

  it("carries the field and the offending value", () => {
    let thrown: unknown;

    try {
      parseBillingInterval("weekly");
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(DataIntegrityError);
    expect(thrown).toMatchObject({ field: "billingInterval", value: "weekly" });
  });
});
