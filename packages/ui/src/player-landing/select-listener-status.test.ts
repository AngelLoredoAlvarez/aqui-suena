import { describe, expect, it } from "vitest";

import { selectListenerStatus } from "./select-listener-status";

const data = {
  station: { id: "test-pop", name: "Aquí Suena" },
  activeUrl: "https://stream.example.com/live",
  listeners: 42,
};

describe("selectListenerStatus", () => {
  it("maps a successful query with data to success", () => {
    expect(selectListenerStatus({ status: "success", data })).toEqual({
      status: "success",
      data,
    });
  });

  it("maps an errored query to error", () => {
    expect(selectListenerStatus({ status: "error", data: undefined })).toEqual({
      status: "error",
    });
  });

  it("maps a pending query to pending", () => {
    expect(selectListenerStatus({ status: "pending", data: undefined })).toEqual({
      status: "pending",
    });
  });

  it("treats a success without data as pending (defensive)", () => {
    expect(selectListenerStatus({ status: "success", data: undefined })).toEqual({
      status: "pending",
    });
  });
});
