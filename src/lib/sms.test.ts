import { describe, it, expect } from "vitest";
import { toIntl, sendSms } from "./sms";

describe("toIntl", () => {
  it("normalizes Nigerian formats", () => {
    expect(toIntl("08031234567")).toBe("2348031234567");
    expect(toIntl("+2348031234567")).toBe("2348031234567");
    expect(toIntl("2348031234567")).toBe("2348031234567");
    expect(toIntl("8031234567")).toBe("2348031234567");
  });
});

describe("sendSms", () => {
  it("refuses without a key, never throws", async () => {
    const r = await sendSms("08031234567", "hello");
    expect(r.delivered).toBe(false);
    expect(r.reason).toBe("no-key");
  });
});
