/**
 * @import { Expression, ItemPattern, Kernel } from "./kernel.d.ts"
 */

/**
 * Rewrite every keyword group's expression to its normal form (KERNEL.md,
 * "Normal form"), so everything after only sees one form of each meaning.
 * Nothing can observe these rewrites, plugins included, so they always
 * apply. A group's expression can become `pass`, but the group stays,
 * because plugins see it.
 *
 * @type (kernel: Kernel) => Kernel
 */
export const normalize = (kernel) => {
  /** @type Kernel["schemas"] */
  const schemas = {};
  for (const handle in kernel.schemas) {
    const schema = kernel.schemas[handle];
    schemas[handle] = typeof schema === "boolean"
      ? schema
      : { ...schema, keywords: schema.keywords.map((group) => ({ ...group, expression: normalForm(group.expression) })) };
  }

  return { ...kernel, schemas };
};

/**
 * - `all` and `any` in themselves are flattened, `pass` in `all` and `fail`
 *   in `any` are dropped, and `all` or `any` of one is the one
 * - `oneOfValues` of one value is `equals`
 * - `typeIs` with no types is `fail`
 * - limits that always pass are dropped (a count's `min: 0`, and `false`
 *   for `exclusiveMin` or `exclusiveMax`), and `range` or a count without
 *   limits is `pass`
 *
 * A rule has to keep what an expression applies to, so `range` with equal
 * limits stays a `range`. `equals` doesn't pass every string.
 *
 * @type (expression: Expression) => Expression
 */
export const normalForm = (expression) => {
  switch (expression.op) {
    case "all":
    case "any": {
      const { op } = expression;
      const identity = op === "all" ? "pass" : "fail";

      /** @type Expression[] */
      const of = [];
      for (const subexpression of expression.of.map(normalForm)) {
        if (subexpression.op === op) {
          const { of: flattened } = /** @type {{ of: Expression[] }} */ (/** @type unknown */ (subexpression));
          of.push(...flattened);
        } else if (subexpression.op !== identity) {
          of.push(subexpression);
        }
      }

      return of.length === 0 ? { op: identity } : of.length === 1 ? of[0] : { op, of };
    }
    case "one":
      return { ...expression, of: expression.of.map(normalForm) };
    case "not":
    case "item":
    case "eachItem":
    case "contains":
    case "property":
    case "eachProperty":
    case "eachPropertyName":
      return { ...expression, of: normalForm(expression.of) };
    case "cases":
      return {
        ...expression,
        cases: expression.cases.map(([condition, then]) => [normalForm(condition), then && normalForm(then)]),
        otherwise: expression.otherwise && normalForm(expression.otherwise)
      };
    case "typeSwitch":
      return {
        ...expression,
        cases: Object.fromEntries(Object.entries(expression.cases).map(([type, then]) => [type, normalForm(then)])),
        otherwise: normalForm(expression.otherwise)
      };
    case "propertySwitch":
      return {
        ...expression,
        cases: expression.cases.map(([value, then]) => [value, normalForm(then)]),
        other: normalForm(expression.other),
        absent: normalForm(expression.absent),
        unparsed: normalForm(expression.unparsed)
      };
    case "itemSequence":
      return { ...expression, pattern: normalPattern(expression.pattern) };
    case "opaque":
      return { ...expression, schemas: expression.schemas.map(normalForm) };
    case "oneOfValues":
      return expression.values.length === 1 ? { op: "equals", value: expression.values[0] } : expression;
    case "typeIs":
      return expression.types.length === 0 ? { op: "fail" } : expression;
    case "range": {
      const { exclusiveMin, exclusiveMax, ...range } = expression;
      if (range.min === undefined && range.max === undefined) {
        return { op: "pass" };
      }
      return {
        ...range,
        ...exclusiveMin && range.min !== undefined && { exclusiveMin },
        ...exclusiveMax && range.max !== undefined && { exclusiveMax }
      };
    }
    case "stringLength":
    case "itemCount":
    case "propertyCount": {
      const { min, ...count } = expression;
      if (min === undefined || min === 0) {
        return count.max === undefined ? { op: "pass" } : count;
      }
      return expression;
    }
    default:
      return expression;
  }
};

/** @type (pattern: ItemPattern) => ItemPattern */
const normalPattern = (pattern) => {
  if ("item" in pattern) {
    return { item: normalForm(pattern.item) };
  } else if ("repeat" in pattern) {
    return { ...pattern, repeat: normalPattern(pattern.repeat) };
  } else if ("sequence" in pattern) {
    return { sequence: pattern.sequence.map(normalPattern) };
  }

  return { either: pattern.either.map(normalPattern) };
};
