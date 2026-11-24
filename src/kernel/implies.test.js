import { describe, test, expect } from "vitest";
import { excludes, implies } from "./implies.js";

/**
 * @import { Expression } from "./kernel.d.ts"
 */

/** @type (schema: string) => Expression */
const apply = (schema) => ({ op: "apply", schema });

/** @type Expression */
const isString = { op: "typeIs", types: ["string"] };
/** @type Expression */
const isNumber = { op: "typeIs", types: ["number"] };
/** @type Expression */
const isInteger = { op: "typeIs", types: ["integer"] };

const none = implies(new Map());

describe("implies", () => {
  test("anything implies what always passes, and fail implies anything", () => {
    expect(none(isString, { op: "pass" })).to.equal(true);
    expect(none({ op: "fail" }, isString)).to.equal(true);
    expect(none(isString, { op: "annotate", value: "a" })).to.equal(true);
    expect(none(isString, { op: "format", name: "email", uri: null, assert: false })).to.equal(true);
    expect(none(isNumber, { op: "format", name: "email", uri: "https://example.com/email", assert: true })).to.equal(false);
    expect(none({ op: "pass" }, isString)).to.equal(false);
    expect(none(isString, { op: "fail" })).to.equal(false);
  });

  test("typeIs implies a typeIs with its types", () => {
    expect(none(isString, { op: "typeIs", types: ["string", "null"] })).to.equal(true);
    expect(none({ op: "typeIs", types: ["string", "null"] }, isString)).to.equal(false);
    expect(none(isInteger, isNumber)).to.equal(true);
    expect(none(isNumber, isInteger)).to.equal(false);
  });

  test("typeIs implies an operation that doesn't apply to its types", () => {
    expect(none(isString, { op: "range", min: 1 })).to.equal(true);
    expect(none(isNumber, { op: "range", min: 1 })).to.equal(false);
    expect(none(isInteger, { op: "range", min: 1 })).to.equal(false);
    expect(none({ op: "typeIs", types: ["string", "array"] }, { op: "hasProperty", name: "a" })).to.equal(true);
  });

  test("a range implies a looser one", () => {
    expect(none({ op: "range", max: 3 }, { op: "range", max: 4 })).to.equal(true);
    expect(none({ op: "range", max: 4 }, { op: "range", max: 3 })).to.equal(false);
    expect(none({ op: "range", min: 2 }, { op: "range", min: 1 })).to.equal(true);
    expect(none({ op: "range", min: 1 }, { op: "range", min: 2 })).to.equal(false);
    expect(none({ op: "range", min: 1 }, { op: "range", max: 2 })).to.equal(false);
    expect(none({ op: "range", min: 1, max: 2 }, { op: "range", min: 0, max: 3 })).to.equal(true);
    expect(none({ op: "range", min: 1, max: 4 }, { op: "range", min: 0, max: 3 })).to.equal(false);
  });

  test("an exclusive limit is tighter than the same inclusive one", () => {
    expect(none({ op: "range", max: 3, exclusiveMax: true }, { op: "range", max: 3 })).to.equal(true);
    expect(none({ op: "range", max: 3 }, { op: "range", max: 3, exclusiveMax: true })).to.equal(false);
    expect(none({ op: "range", min: 3, exclusiveMin: true }, { op: "range", min: 3, exclusiveMin: true })).to.equal(true);
    expect(none({ op: "range", min: 3 }, { op: "range", min: 3, exclusiveMin: true })).to.equal(false);
  });

  test("a count implies a looser one of the same kind", () => {
    expect(none({ op: "stringLength", max: 3 }, { op: "stringLength", max: 4 })).to.equal(true);
    expect(none({ op: "stringLength", max: 4 }, { op: "stringLength", max: 3 })).to.equal(false);
    expect(none({ op: "itemCount", min: 2, max: 3 }, { op: "itemCount", min: 1 })).to.equal(true);
    expect(none({ op: "propertyCount", min: 2 }, { op: "propertyCount", min: 1, max: 3 })).to.equal(false);
    expect(none({ op: "itemCount", max: 3 }, { op: "stringLength", max: 4 })).to.equal(false);
  });

  test("limits from two operations imply one with both", () => {
    /** @type Expression */
    const a = { op: "all", of: [{ op: "range", min: 1 }, { op: "range", max: 5 }] };
    expect(none(a, { op: "range", min: 0, max: 10 })).to.equal(true);
    expect(none(a, { op: "range", min: 0, max: 4 })).to.equal(false);
  });

  test("values imply what they pass", () => {
    expect(none({ op: "equals", value: 1 }, { op: "oneOfValues", values: [1, 2] })).to.equal(true);
    expect(none({ op: "oneOfValues", values: [1, 2] }, { op: "equals", value: 1 })).to.equal(false);
    expect(none({ op: "oneOfValues", values: [1, 2] }, { op: "oneOfValues", values: [2, 1, 3] })).to.equal(true);
    expect(none({ op: "equals", value: { a: 1, b: [2] } }, { op: "equals", value: { b: [2], a: 1 } })).to.equal(true);
    expect(none({ op: "oneOfValues", values: ["a", "b"] }, isString)).to.equal(true);
    expect(none({ op: "oneOfValues", values: ["a", 1] }, isString)).to.equal(false);
    expect(none({ op: "equals", value: 1 }, isInteger)).to.equal(true);
    expect(none({ op: "equals", value: 1.5 }, isInteger)).to.equal(false);
    expect(none({ op: "equals", value: 3 }, { op: "range", max: 4 })).to.equal(true);
    expect(none({ op: "equals", value: 5 }, { op: "range", max: 4 })).to.equal(false);
    expect(none({ op: "equals", value: "a" }, { op: "range", max: 4 })).to.equal(true);
    expect(none({ op: "equals", value: "😀" }, { op: "stringLength", max: 1 })).to.equal(true);
    expect(none({ op: "equals", value: [1, 2] }, { op: "itemCount", max: 1 })).to.equal(false);
    expect(none({ op: "equals", value: { a: 1 } }, { op: "hasProperty", name: "a" })).to.equal(true);
    expect(none({ op: "equals", value: { a: 1 } }, { op: "propertyEquals", name: "a", value: 2 })).to.equal(false);
    expect(none({ op: "equals", value: { a: 1 } }, { op: "propertyCount", min: 1 })).to.equal(true);
    expect(none({ op: "equals", value: 1 }, { op: "not", of: isString })).to.equal(true);
    expect(none({ op: "equals", value: "a" }, { op: "not", of: isString })).to.equal(false);
  });

  test("a value isn't known to pass what can't be checked without a schema", () => {
    expect(none({ op: "equals", value: "a" }, { op: "matches", pattern: "a" })).to.equal(false);
    expect(none({ op: "equals", value: 2 }, { op: "multipleOf", divisor: 2 })).to.equal(false);
    expect(none({ op: "equals", value: 2 }, { op: "matches", pattern: "a" })).to.equal(true);
  });

  test("all and any", () => {
    /** @type Expression */
    const shortString = { op: "all", of: [isString, { op: "stringLength", max: 3 }] };
    expect(none(shortString, { op: "stringLength", max: 4 })).to.equal(true);
    expect(none(shortString, { op: "all", of: [isString, { op: "stringLength", max: 4 }] })).to.equal(true);
    expect(none({ op: "stringLength", max: 3 }, shortString)).to.equal(false);
    expect(none(isString, { op: "any", of: [isNumber, isString] })).to.equal(true);
    expect(none({ op: "any", of: [isNumber, isString] }, isString)).to.equal(false);
    expect(none({ op: "any", of: [isInteger, isNumber] }, isNumber)).to.equal(true);
    expect(none({ op: "one", of: [isInteger, isNumber] }, isNumber)).to.equal(true);
    expect(none(shortString, { op: "any", of: [isNumber, { op: "stringLength", max: 5 }] })).to.equal(true);
    expect(none(shortString, { op: "any", of: [isNumber, shortString] })).to.equal(true);
  });

  test("operations on children imply the same operation of what theirs implies", () => {
    expect(none({ op: "property", name: "a", of: isInteger }, { op: "property", name: "a", of: isNumber })).to.equal(true);
    expect(none({ op: "property", name: "a", of: isNumber }, { op: "property", name: "a", of: isInteger })).to.equal(false);
    expect(none({ op: "property", name: "a", of: isInteger }, { op: "property", name: "b", of: isNumber })).to.equal(false);
    expect(none({ op: "item", index: 0, of: isInteger }, { op: "item", index: 0, of: isNumber })).to.equal(true);
    expect(none({ op: "item", index: 0, of: isInteger }, { op: "item", index: 1, of: isNumber })).to.equal(false);
    expect(none({ op: "eachItem", from: 0, of: isInteger }, { op: "eachItem", from: 1, of: isNumber })).to.equal(true);
    expect(none({ op: "eachItem", from: 1, of: isInteger }, { op: "eachItem", from: 0, of: isNumber })).to.equal(false);
    expect(none({ op: "eachPropertyName", of: { op: "stringLength", max: 3 } }, { op: "eachPropertyName", of: { op: "stringLength", max: 4 } })).to.equal(true);
    expect(none(
      { op: "eachProperty", select: { pattern: "^a" }, of: isInteger },
      { op: "eachProperty", select: { pattern: "^a" }, of: isNumber }
    )).to.equal(true);
    expect(none(
      { op: "eachProperty", select: { pattern: "^a" }, of: isInteger },
      { op: "eachProperty", select: { pattern: "^b" }, of: isNumber }
    )).to.equal(false);
  });

  test("not implies not of what implies its expression", () => {
    expect(none({ op: "not", of: isNumber }, { op: "not", of: isInteger })).to.equal(true);
    expect(none({ op: "not", of: isInteger }, { op: "not", of: isNumber })).to.equal(false);
  });

  test("anything implies not of what it excludes", () => {
    expect(none(isString, { op: "not", of: isNumber })).to.equal(true);
    expect(none(isNumber, { op: "not", of: isInteger })).to.equal(false);
    expect(none({ op: "all", of: [isNumber, { op: "range", max: 3 }] }, { op: "not", of: { op: "all", of: [isNumber, { op: "range", min: 5 }] } })).to.equal(true);
    expect(none({ op: "range", max: 3 }, { op: "not", of: { op: "range", min: 5 } })).to.equal(false);
  });

  test("propertyEquals implies hasProperty", () => {
    expect(none({ op: "propertyEquals", name: "a", value: 1 }, { op: "hasProperty", name: "a" })).to.equal(true);
    expect(none({ op: "propertyEquals", name: "a", value: 1 }, { op: "hasProperty", name: "b" })).to.equal(false);
  });

  test("anything else implies only the same expression", () => {
    expect(none({ op: "matches", pattern: "a" }, { op: "matches", pattern: "a" })).to.equal(true);
    expect(none({ op: "matches", pattern: "a" }, { op: "matches", pattern: "b" })).to.equal(false);
    expect(none({ op: "multipleOf", divisor: 4 }, { op: "multipleOf", divisor: 2 })).to.equal(false);
    expect(none(
      { op: "cases", cases: [[isString, { op: "stringLength", max: 3 }]], otherwise: null },
      { op: "cases", otherwise: null, cases: [[isString, { op: "stringLength", max: 3 }]] }
    )).to.equal(true);
  });

  test("what depends on more than the instance doesn't imply itself", () => {
    /** @type Expression */
    const unevaluatedProperties = { op: "eachProperty", select: { unevaluated: true }, of: isString };
    expect(none(unevaluatedProperties, unevaluatedProperties)).to.equal(false);
    /** @type Expression */
    const unevaluatedItems = { op: "eachItem", unevaluated: true, of: isString };
    expect(none(unevaluatedItems, unevaluatedItems)).to.equal(false);
    /** @type Expression */
    const dynamic = { op: "dynamicApply", anchor: "a", fallback: null };
    expect(none(dynamic, dynamic)).to.equal(false);
    /** @type Expression */
    const opaque = { op: "opaque", keyword: "https://example.com/keyword", value: null, schemas: [] };
    expect(none({ op: "not", of: opaque }, { op: "not", of: opaque })).to.equal(false);
  });

  describe("schemas", () => {
    /** @type Map<string, Expression[]> */
    const schemas = new Map([
      ["true", []],
      ["false", [{ op: "fail" }]],
      ["max3", [{ op: "range", max: 3 }]],
      ["max4", [{ op: "range", max: 4 }]],
      ["integerMax3", [isInteger, { op: "range", max: 3 }]],
      ["numberMax4", [isNumber, { op: "range", max: 4 }]],
      ["viaAllOf", [{ op: "all", of: [apply("integerMax3")] }]],
      ["nestedMax3", [{ op: "eachItem", from: 0, of: apply("nestedMax3") }, { op: "range", max: 3 }]],
      ["nestedMax4", [{ op: "eachItem", from: 0, of: apply("nestedMax4") }, { op: "range", max: 4 }]],
      ["itself", [{ op: "any", of: [apply("itself"), isString] }]]
    ]);
    const withSchemas = implies(schemas);

    test("a schema is all of its groups", () => {
      expect(withSchemas(apply("max3"), apply("max4"))).to.equal(true);
      expect(withSchemas(apply("max4"), apply("max3"))).to.equal(false);
      expect(withSchemas(apply("integerMax3"), apply("numberMax4"))).to.equal(true);
      expect(withSchemas(apply("numberMax4"), apply("integerMax3"))).to.equal(false);
      expect(withSchemas(apply("viaAllOf"), apply("numberMax4"))).to.equal(true);
      expect(withSchemas(apply("integerMax3"), isNumber)).to.equal(true);
      expect(withSchemas({ op: "equals", value: 2 }, apply("integerMax3"))).to.equal(true);
      expect(withSchemas({ op: "equals", value: 2.5 }, apply("integerMax3"))).to.equal(false);
    });

    test("boolean schemas", () => {
      expect(withSchemas(apply("max3"), apply("true"))).to.equal(true);
      expect(withSchemas(apply("true"), apply("max3"))).to.equal(false);
      expect(withSchemas(apply("false"), apply("max3"))).to.equal(true);
      expect(withSchemas(apply("max3"), apply("false"))).to.equal(false);
    });

    test("a schema that isn't known implies only itself", () => {
      expect(withSchemas(apply("unknown"), apply("unknown"))).to.equal(true);
      expect(withSchemas(apply("unknown"), apply("true"))).to.equal(true);
      expect(withSchemas(apply("unknown"), apply("max3"))).to.equal(false);
      expect(withSchemas(apply("max3"), apply("unknown"))).to.equal(false);
    });

    test("schemas that apply themselves", () => {
      expect(withSchemas(apply("nestedMax3"), apply("nestedMax3"))).to.equal(true);
      expect(withSchemas(apply("nestedMax3"), { op: "range", max: 4 })).to.equal(true);
      // It does, but a pair that's being compared isn't known to
      expect(withSchemas(apply("nestedMax3"), apply("nestedMax4"))).to.equal(false);
      expect(withSchemas(apply("itself"), isString)).to.equal(false);
      expect(withSchemas(isString, apply("itself"))).to.equal(true);
    });
  });
});

describe("excludes", () => {
  const none = excludes(new Map());

  /** @type (...of: Expression[]) => Expression */
  const all = (...of) => ({ op: "all", of });
  /** @type (...of: Expression[]) => Expression */
  const any = (...of) => ({ op: "any", of });

  /** @type (a: Expression, b: Expression, expected: boolean) => void */
  const expectExcludes = (a, b, expected) => {
    expect(none(a, b)).to.equal(expected);
    expect(none(b, a)).to.equal(expected);
  };

  test("fail excludes everything, and pass nothing", () => {
    expectExcludes({ op: "fail" }, isString, true);
    expectExcludes({ op: "fail" }, { op: "pass" }, true);
    expectExcludes({ op: "pass" }, isString, false);
    expectExcludes({ op: "pass" }, { op: "pass" }, false);
  });

  test("types", () => {
    expectExcludes(isString, isNumber, true);
    expectExcludes(isString, { op: "typeIs", types: ["string", "null"] }, false);
    expectExcludes(isInteger, isNumber, false);
    expectExcludes(isInteger, isString, true);
  });

  test("values", () => {
    expectExcludes({ op: "equals", value: 1 }, { op: "equals", value: 2 }, true);
    expectExcludes({ op: "equals", value: 1 }, { op: "oneOfValues", values: [1, 2] }, false);
    expectExcludes({ op: "oneOfValues", values: ["a", "b"] }, { op: "oneOfValues", values: ["c", 1] }, true);
    expectExcludes({ op: "oneOfValues", values: ["a", 1] }, { op: "oneOfValues", values: ["c", 1] }, false);
    expectExcludes({ op: "equals", value: "a" }, isNumber, true);
    expectExcludes({ op: "equals", value: 1.5 }, isInteger, true);
    expectExcludes({ op: "equals", value: 1 }, isInteger, false);
    expectExcludes({ op: "equals", value: 5 }, { op: "range", max: 4 }, true);
    expectExcludes({ op: "equals", value: 3 }, { op: "range", max: 4 }, false);
    expectExcludes({ op: "equals", value: "abc" }, { op: "stringLength", max: 2 }, true);
    expectExcludes({ op: "oneOfValues", values: ["abc", 5] }, { op: "stringLength", max: 2 }, false);
    expectExcludes({ op: "equals", value: { a: 1 } }, { op: "hasProperty", name: "b" }, true);
    expectExcludes({ op: "equals", value: "a" }, { op: "matches", pattern: "b" }, false);
  });

  test("limits that don't overlap exclude only with the type", () => {
    expectExcludes({ op: "range", max: 3 }, { op: "range", min: 5 }, false);
    expectExcludes(all(isNumber, { op: "range", max: 3 }), { op: "range", min: 5 }, true);
    expectExcludes(all(isNumber, { op: "range", max: 5 }), { op: "range", min: 5 }, false);
    expectExcludes(all(isNumber, { op: "range", max: 5, exclusiveMax: true }), { op: "range", min: 5 }, true);
    expectExcludes(all(isNumber, { op: "range", max: 5 }), { op: "range", min: 5, exclusiveMin: true }, true);
    expectExcludes(all(isString, { op: "stringLength", max: 3 }), { op: "stringLength", min: 4 }, true);
    expectExcludes(all(isString, { op: "stringLength", max: 3 }), { op: "stringLength", min: 3 }, false);
    expectExcludes(all({ op: "typeIs", types: ["array"] }, { op: "itemCount", max: 1 }), { op: "itemCount", min: 2 }, true);
    expectExcludes(all({ op: "typeIs", types: ["object"] }, { op: "propertyCount", max: 1 }), { op: "propertyCount", min: 2 }, true);
    expectExcludes(all(isString, { op: "stringLength", max: 3 }), { op: "itemCount", min: 4 }, false);
  });

  test("limits of one side that don't overlap", () => {
    expectExcludes(all(isNumber, { op: "range", min: 5, max: 4 }), { op: "pass" }, true);
    expectExcludes(all(isNumber, { op: "range", min: 5 }, { op: "range", max: 4 }), isNumber, true);
    expectExcludes({ op: "range", min: 5, max: 4 }, { op: "pass" }, false);
  });

  test("any excludes what every one of its expressions does", () => {
    expectExcludes(any(isString, isNumber), { op: "typeIs", types: ["null"] }, true);
    expectExcludes(any(isString, isNumber), isNumber, false);
    expectExcludes(any({ op: "equals", value: 1 }, { op: "equals", value: 2 }), all(isNumber, { op: "range", min: 3 }), true);
    expectExcludes({ op: "one", of: [isString, isNumber] }, { op: "typeIs", types: ["null"] }, true);
  });

  test("not excludes what implies its expression", () => {
    expectExcludes({ op: "not", of: isNumber }, isInteger, true);
    expectExcludes({ op: "not", of: isInteger }, isNumber, false);
    expectExcludes({ op: "not", of: { op: "range", max: 4 } }, all(isNumber, { op: "range", max: 3 }), true);
    expectExcludes({ op: "not", of: { op: "range", max: 4 } }, { op: "range", max: 3 }, true);
    expectExcludes({ op: "not", of: { op: "hasProperty", name: "a" } }, { op: "hasProperty", name: "b" }, false);
    expectExcludes(
      { op: "not", of: { op: "hasProperty", name: "a" } },
      all({ op: "typeIs", types: ["object"] }, { op: "hasProperty", name: "a" }),
      true
    );
  });

  test("a property both say something about, which one of them requires", () => {
    /** @type (value: string, required?: boolean) => Expression */
    const tagged = (value, required = true) => all(
      { op: "typeIs", types: ["object"] },
      { op: "property", name: "type", of: { op: "equals", value } },
      ...required ? [/** @type Expression */ ({ op: "hasProperty", name: "type" })] : []
    );
    expectExcludes(tagged("a"), tagged("b"), true);
    expectExcludes(tagged("a"), tagged("b", false), true);
    expectExcludes(tagged("a", false), tagged("b", false), false);
    expectExcludes(tagged("a"), tagged("a"), false);
    expectExcludes(
      all({ op: "typeIs", types: ["object"] }, { op: "propertyEquals", name: "type", value: "a" }),
      all({ op: "typeIs", types: ["object"] }, { op: "propertyEquals", name: "type", value: "b" }),
      true
    );
    expectExcludes({ op: "propertyEquals", name: "type", value: "a" }, { op: "propertyEquals", name: "type", value: "b" }, false);
  });

  test("schemas", () => {
    /** @type Map<string, Expression[]> */
    const schemas = new Map([
      ["false", [{ op: "fail" }]],
      ["string", [isString]],
      ["number", [isNumber, { op: "annotate", value: "a" }]],
      ["small", [apply("number"), { op: "range", max: 3 }]],
      ["large", [apply("number"), { op: "range", min: 5 }]],
      ["notSmall", [{ op: "not", of: apply("small") }]],
      ["a", [{ op: "not", of: apply("b") }]],
      ["b", [{ op: "not", of: apply("a") }]]
    ]);
    const withSchemas = excludes(schemas);
    expect(withSchemas(apply("string"), apply("number"))).to.equal(true);
    expect(withSchemas(apply("small"), apply("large"))).to.equal(true);
    expect(withSchemas(apply("large"), apply("small"))).to.equal(true);
    expect(withSchemas(apply("small"), apply("number"))).to.equal(false);
    expect(withSchemas(apply("small"), apply("notSmall"))).to.equal(true);
    expect(withSchemas(apply("false"), apply("unknown"))).to.equal(true);
    expect(withSchemas(apply("string"), apply("unknown"))).to.equal(false);
    expect(withSchemas(apply("a"), apply("b"))).to.equal(true);
    expect(withSchemas(apply("a"), apply("a"))).to.equal(false);
  });
});
