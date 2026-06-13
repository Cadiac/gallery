import { describe, it, expect } from "vitest";
import { slugify, uniqueSlug } from "./slug";

describe("slugify", () => {
  it("lowercases, strips diacritics and collapses separators", () => {
    expect(slugify("Café au Lait")).toBe("cafe-au-lait");
    expect(slugify("  Winter   Study  ")).toBe("winter-study");
    expect(slugify("Étude #3 — blue/green")).toBe("etude-3-blue-green");
  });
  it("returns empty for symbol-only input", () => {
    expect(slugify("!!!")).toBe("");
    expect(slugify("   ")).toBe("");
  });
});

describe("uniqueSlug", () => {
  it("returns the bare slug when free", () => {
    expect(uniqueSlug("Winter Study", () => false)).toBe("winter-study");
  });
  it("appends an incrementing suffix on collision", () => {
    const taken = new Set(["winter-study", "winter-study-2"]);
    expect(uniqueSlug("Winter Study", (s) => taken.has(s))).toBe("winter-study-3");
  });
  it("falls back to 'artwork' for empty titles", () => {
    expect(uniqueSlug("!!!", () => false)).toBe("artwork");
    const taken = new Set(["artwork"]);
    expect(uniqueSlug("", (s) => taken.has(s))).toBe("artwork-2");
  });
});
