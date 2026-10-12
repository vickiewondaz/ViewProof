import { describe, it, expect } from "vitest";
import { parseCsv } from "./csv";

describe("parseCsv", () => {
  it("parses headers + rows", () => {
    const rows = parseCsv("title,type,area\nFlat,rent,Lekki\n");
    expect(rows).toEqual([["title", "type", "area"], ["Flat", "rent", "Lekki"]]);
  });
  it("handles quoted commas + escaped quotes", () => {
    const rows = parseCsv('title,area\n"3-bed, serviced","Gwarinpa, Abuja"\n"Say ""hi""",Lekki\n');
    expect(rows[1]).toEqual(["3-bed, serviced", "Gwarinpa, Abuja"]);
    expect(rows[2]).toEqual(['Say "hi"', "Lekki"]);
  });
  it("skips blank lines", () => {
    expect(parseCsv("a,b\n\nc,d\n")).toEqual([["a", "b"], ["c", "d"]]);
  });
});
