import { describe, test, expect } from "vitest";
import { mapSubexpressions, subexpressions } from "./kernel.js";

/**
 * @import { Expression } from "./kernel.d.ts"
 */

/** @type Expression */
const a = { op: "equals", value: "a" };
/** @type Expression */
const b = { op: "equals", value: "b" };
/** @type Expression */
const c = { op: "equals", value: "c" };

/** @type Expression[] */
const expressions = [
  { op: "all", of: [a, b] },
  { op: "any", of: [a, b] },
  { op: "one", of: [a, b] },
  { op: "not", of: a },
  { op: "item", index: 0, of: a },
  { op: "eachItem", from: 1, of: a },
  { op: "contains", of: a, min: 1, max: null },
  { op: "property", name: "foo", of: a },
  { op: "eachProperty", select: { pattern: "^x" }, of: a },
  { op: "eachPropertyName", of: a },
  { op: "cases", cases: [[a, b], [c, null]], otherwise: a },
  { op: "cases", cases: [[a, null]], otherwise: null },
  { op: "typeSwitch", cases: { string: a, object: b }, otherwise: c },
  { op: "propertySwitch", name: "type", cases: [["x", a]], other: b, absent: c, unparsed: a },
  { op: "keySwitch", cases: [["x", a], ["y", b]], none: c, unparsed: a },
  { op: "itemSequence", pattern: { sequence: [{ item: a }, { repeat: { either: [{ item: b }, { item: c }] }, min: 0, max: null }] } },
  { op: "opaque", keyword: "https://example.com/keyword", value: null, schemas: [a, b] }
];

/** @type (expression: Expression) => Expression */
const wrap = (expression) => ({ op: "not", of: expression });

describe("mapSubexpressions", () => {
  test.each(expressions.map((expression) => [expression.op, expression]))("maps every subexpression of %s", (_op, expression) => {
    const mapped = mapSubexpressions(expression, wrap);
    expect(mapped.op).to.equal(expression.op);
    expect(subexpressions(mapped)).to.eql(subexpressions(expression).map(wrap));
  });

  test.each(expressions.map((expression) => [expression.op, expression]))("returns %s unchanged when nothing changes", (_op, expression) => {
    expect(mapSubexpressions(expression, (subexpression) => subexpression)).to.equal(expression);
  });

  test("keeps the parts that didn't change", () => {
    /** @type Expression */
    const expression = { op: "cases", cases: [[a, b], [c, null]], otherwise: null };
    const mapped = /** @type Extract<Expression, { op: "cases" }> */ (mapSubexpressions(expression, (subexpression) => subexpression === c ? wrap(c) : subexpression));
    expect(mapped.cases[0]).to.equal(expression.cases[0]);
    expect(mapped.cases[1]).to.eql([wrap(c), null]);
  });

  test("leaves operations without subexpressions as they are", () => {
    expect(mapSubexpressions(a, wrap)).to.equal(a);
    expect(mapSubexpressions({ op: "apply", schema: "#" }, wrap)).to.eql({ op: "apply", schema: "#" });
  });
});
