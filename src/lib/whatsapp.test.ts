import { describe, it, expect } from "vitest";
import { createHmac } from "crypto";
import { verifyWebhookSignature } from "./whatsapp";

const SECRET = "test-app-secret";
const BODY = '{"entry":[{"changes":[{"value":{"messages":[{"from":"2341","text":{"body":"CANCEL"}}]}}]}]}';
const good = "sha256=" + createHmac("sha256", SECRET).update(BODY, "utf8").digest("hex");

describe("verifyWebhookSignature", () => {
  it("accepts Meta's genuine signature", async () => {
    expect(await verifyWebhookSignature(BODY, good, SECRET)).toBe(true);
  });
  it("rejects forged, missing, and malformed signatures", async () => {
    const bad = "sha256=" + "0".repeat(64);
    expect(await verifyWebhookSignature(BODY, bad, SECRET)).toBe(false);
    expect(await verifyWebhookSignature(BODY, null, SECRET)).toBe(false);
    expect(await verifyWebhookSignature(BODY, "garbage", SECRET)).toBe(false);
    expect(await verifyWebhookSignature(BODY + "tampered", good, SECRET)).toBe(false);
  });
});
