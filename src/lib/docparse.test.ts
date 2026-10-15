import { describe, it, expect } from "vitest";
import { detectShape, mapListingColumns } from "./docparse";

const CSV = `title,area,price,type
2-bed flat,Lekki,4500000,2 bedrooms
3-bed duplex,Gwarinpa,8000000,3 bedrooms`;

const SEMI = `Property;Location;Rent
Studio;Yaba;1200000
Mini flat;Ikeja;900000`;

const PROSE = `Tenancy Agreement

This agreement is made on the 1st day of January between the landlord
and the tenant for the property at 14 Allen Avenue, Ikeja.`;

const MESSY = `just some notes
random line here
another thought`;

describe("detectShape", () => {
  it("finds comma tables", () => {
    const r = detectShape(CSV);
    expect(r.kind).toBe("table");
    if (r.kind === "table") {
      expect(r.headers).toEqual(["title", "area", "price", "type"]);
      expect(r.rows).toHaveLength(2);
      expect(r.rows[0][2]).toBe("4500000");
    }
  });
  it("finds semicolon tables", () => {
    const r = detectShape(SEMI);
    expect(r.kind).toBe("table");
    if (r.kind === "table") expect(r.delimiter).toBe(";");
  });
  it("calls prose text, not tables", () => {
    for (const t of [PROSE, MESSY]) {
      const r = detectShape(t);
      expect(r.kind).toBe("text");
      if (r.kind === "text") expect(r.words).toBeGreaterThan(3);
    }
  });
  it("rejects number-heavy first rows (not headers)", () => {
    const r = detectShape(`4500000,8000000,1200000\n2,3,1`);
    expect(r.kind).toBe("text");
  });
});

describe("mapListingColumns", () => {
  it("fuzzy-matches Nigerian headers", () => {
    expect(mapListingColumns(["Property", "Location", "Rent", "Agent Phone"])).toEqual({
      title: 0, area: 1, price: 2, phone: 3,
    });
  });
});
