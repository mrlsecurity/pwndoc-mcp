import { describe, it, expect } from "vitest";
import { requireConfirm } from "../src/lib/confirm.js";

describe("requireConfirm", () => {
  it("throws without confirm:true", () => {
    expect(() => requireConfirm({}, "delete_x")).toThrow(/destructive/);
    expect(() => requireConfirm({ confirm: false }, "delete_x")).toThrow(/destructive/);
    expect(() => requireConfirm({ confirm: "yes" }, "delete_x")).toThrow(/destructive/);
    expect(() => requireConfirm(null, "delete_x")).toThrow(/destructive/);
  });
  it("passes with confirm:true", () => {
    expect(() => requireConfirm({ confirm: true }, "delete_x")).not.toThrow();
  });
});
