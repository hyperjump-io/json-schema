import { describe, test, expect } from "vitest";
import { normalForm } from "./normalize.js";

describe("normalForm", () => {
  test("a count's min: 0 is dropped", () => {
    expect(normalForm({ op: "stringLength", min: 0, max: 3 })).to.eql({ op: "stringLength", max: 3 });
    expect(normalForm({ op: "itemCount", min: 2 })).to.eql({ op: "itemCount", min: 2 });
  });

  test("a count without limits is pass", () => {
    expect(normalForm({ op: "itemCount", min: 0 })).to.eql({ op: "pass" });
    expect(normalForm({ op: "propertyCount" })).to.eql({ op: "pass" });
  });

  test("exclusive limits that are false are dropped", () => {
    expect(normalForm({ op: "range", min: 1, exclusiveMin: false })).to.eql({ op: "range", min: 1 });
    expect(normalForm({ op: "range", max: 1, exclusiveMax: true })).to.eql({ op: "range", max: 1, exclusiveMax: true });
  });

  test("an exclusive flag without its limit is dropped", () => {
    expect(normalForm({ op: "range", max: 1, exclusiveMin: true })).to.eql({ op: "range", max: 1 });
  });

  test("a range without limits is pass", () => {
    expect(normalForm({ op: "range", exclusiveMax: true })).to.eql({ op: "pass" });
  });

  test("a pass from a count is dropped from all", () => {
    expect(normalForm({ op: "all", of: [{ op: "itemCount", min: 0 }, { op: "uniqueItems" }] })).to.eql({ op: "uniqueItems" });
  });
});
