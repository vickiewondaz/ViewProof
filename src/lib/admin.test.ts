import { describe, it, expect } from "vitest";
import { isAdminEmail } from "./admin";

describe("isAdminEmail", () => {
  it("matches case-insensitively, ignores spacing", () => {
    process.env.ADMIN_EMAILS = "Boss@Example.com , landlord@viewproof.app";
    expect(isAdminEmail("boss@example.com")).toBe(true);
    expect(isAdminEmail("LANDLORD@viewproof.app")).toBe(true);
    expect(isAdminEmail("shop@example.com")).toBe(false);
  });
  it("denies everyone when unset", () => {
    process.env.ADMIN_EMAILS = "";
    expect(isAdminEmail("anyone@example.com")).toBe(false);
  });
});
