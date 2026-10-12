import { describe, it, expect } from "vitest";
import { reliability } from "./reliability";

describe("reliability", () => {
  it("welcomes new buyers without prejudice", () => {
    expect(reliability(0, 0).label).toMatch(/no history/);
  });
  it("crowns perfect records", () => {
    expect(reliability(4, 0).label).toMatch(/4\/4.*always shows up/);
  });
  it("states mixed records plainly", () => {
    expect(reliability(3, 1).label).toBe("3/4 attended");
  });
});
