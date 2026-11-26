import {
  ConflictError,
  DataIntegrityError,
  DomainError,
  NotFoundError,
  UpgradeRequired,
  ValidationError,
} from "@aqui-suena/api/shared/domain-error";
import { describe, expect, it } from "vitest";

describe("domain errors", () => {
  it("derives every concrete error from DomainError", () => {
    expect(new ValidationError("x")).toBeInstanceOf(DomainError);
    expect(new NotFoundError("x")).toBeInstanceOf(DomainError);
    expect(new ConflictError("x")).toBeInstanceOf(DomainError);
    expect(new DataIntegrityError("field", 1)).toBeInstanceOf(DomainError);
    expect(new UpgradeRequired("hint")).toBeInstanceOf(DomainError);
  });

  it("sets the name so transport mapping stays stable", () => {
    expect(new ValidationError("x").name).toBe("ValidationError");
    expect(new NotFoundError("x").name).toBe("NotFoundError");
    expect(new ConflictError("x").name).toBe("ConflictError");
    expect(new DataIntegrityError("field", 1).name).toBe("DataIntegrityError");
    expect(new UpgradeRequired("hint").name).toBe("UpgradeRequired");
  });

  it("carries the offending field and value on DataIntegrityError", () => {
    const error = new DataIntegrityError("status", "weird-value");

    expect(error.field).toBe("status");
    expect(error.value).toBe("weird-value");
    expect(error.message).toContain("status");
  });

  it("exposes the UPGRADE_REQUIRED code and hint", () => {
    const error = new UpgradeRequired("PRO_PLAN");

    expect(error.code).toBe("UPGRADE_REQUIRED");
    expect(error.hint).toBe("PRO_PLAN");
  });
});
