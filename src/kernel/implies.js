import { codePointLength, instanceEqual } from "../keywords/utilities.js";
import { jsInstance } from "./instance.js";
import { domains, subexpressions } from "./kernel.js";

/**
 * @import { Json } from "@hyperjump/browser"
 * @import { Expression, ExpressionOf, Handle, JsonTypeName, Limits, TypeName } from "./kernel.d.ts"
 */

/**
 * Whether every instance that passes one expression passes another, as far
 * as it's known from the expressions: `true` is sure, and `false` is "not
 * known", never "it doesn't". It's about the result only, not about what
 * either one marks or annotates.
 *
 * `schemas` is what each schema an `apply` can apply is: its keyword
 * groups' expressions, which all have to pass (none for `true`, and `fail`
 * for `false`). A schema that isn't in it implies only itself.
 *
 * - Anything implies what always passes (`pass`, `annotate`, and a
 *   `format` that doesn't assert), and `fail` implies anything
 * - An expression implies `all` if it implies every one, and `any` if it
 *   implies one of them. `all` implies what one of its expressions
 *   implies, and `any` and `one` what every one of theirs does. `apply` and
 *   `inline` are `all` of the schema's groups.
 * - `typeIs` implies a `typeIs` with its types, and any operation that
 *   doesn't apply to its types. Limits imply looser limits of the same
 *   kind. `equals` and `oneOfValues` imply what their values pass, where
 *   an operation can be checked without a schema.
 * - An operation on a property, an item, or property names implies the same
 *   operation of what its expression implies, and `not` implies `not` of
 *   what implies its expression
 * - Anything else only implies an expression that's the same, and one that
 *   reads marks or the dynamic scope, or is `opaque`, doesn't imply even
 *   that, because it can have a different result where the other one is
 *
 * A schema that's being compared when it's reached again, because it
 * applies itself, isn't known to imply anything, so two schemas that apply
 * themselves the same way aren't known to imply each other.
 *
 * @type (schemas: ReadonlyMap<Handle, Expression[]>) => (a: Expression, b: Expression) => boolean
 */
export const implies = (schemas) => {
  // What's known about each pair of schemas. A pair that's being compared
  // isn't known to imply, and whatever is found from there is still sure.
  /** @type Map<string, boolean> */
  const known = new Map();

  /** @type (a: Handle, b: Handle) => boolean */
  const schemaImplies = (a, b) => {
    if (a === b) {
      return true;
    }

    const pair = `${a}\0${b}`;
    let result = known.get(pair);
    if (result === undefined) {
      known.set(pair, false);
      const bGroups = schemas.get(b);
      result = bGroups !== undefined && bGroups.every((group) => expressionImplies({ op: "apply", schema: a }, group));
      known.set(pair, result);
    }
    return result;
  };

  // The schemas being looked into on each side, so one that applies itself
  // isn't looked into forever
  /** @type Set<Handle> */
  const aExpanding = new Set();
  /** @type Set<Handle> */
  const bExpanding = new Set();

  /** @type (expanding: Set<Handle>, handle: Handle, test: (groups: Expression[]) => boolean) => boolean */
  const expand = (expanding, handle, test) => {
    const groups = schemas.get(handle);
    if (groups === undefined || expanding.has(handle)) {
      return false;
    }

    expanding.add(handle);
    const result = test(groups);
    expanding.delete(handle);
    return result;
  };

  /** @type (a: Expression, b: Expression) => boolean */
  const expressionImplies = (a, b) => {
    if (alwaysPasses(b) || a.op === "fail") {
      return true;
    }

    // What says exactly what its parts say
    if (b.op === "all") {
      return b.of.every((of) => expressionImplies(a, of));
    } else if (b.op === "inline") {
      return b.keywords.every(({ expression }) => expressionImplies(a, expression));
    } else if (hasBothLimits(b)) {
      return expressionImplies(a, withoutLimit(b, "max")) && expressionImplies(a, withoutLimit(b, "min"));
    } else if (a.op === "any" || a.op === "one") {
      return a.of.every((of) => expressionImplies(of, b));
    } else if (a.op === "apply" && b.op === "apply") {
      return schemaImplies(a.schema, b.schema);
    } else if (b.op === "apply") {
      return expand(bExpanding, b.schema, (groups) => groups.every((group) => expressionImplies(a, group)));
    } else if (a.op === "apply") {
      return expand(aExpanding, a.schema, (groups) => expressionImplies({ op: "all", of: groups }, b));
    }

    // What says more than is needed: one part is enough
    if (a.op === "all" || a.op === "inline") {
      const of = a.op === "inline" ? a.keywords.map(({ expression }) => expression) : a.of;
      if (of.some((each) => expressionImplies(each, b))) {
        return true;
      }
    }
    if (b.op === "any") {
      return b.of.some((of) => expressionImplies(a, of));
    }

    return operationImplies(a, b);
  };

  /** @type (a: Expression, b: Expression) => boolean */
  const operationImplies = (a, b) => {
    const bDomain = domains[b.op];

    switch (a.op) {
      case "typeIs":
        if (b.op === "typeIs") {
          return a.types.every((type) => allowsType(b.types, type));
        }
        return bDomain !== undefined && !allowsType(a.types, bDomain) && !(bDomain === "number" && a.types.includes("integer"));
      case "equals":
        return valuePasses(a.value, b) === true;
      case "oneOfValues":
        return a.values.every((value) => valuePasses(value, b) === true);
      case "range":
        return b.op === "range" && rangeImplies(a, b);
      case "stringLength":
      case "itemCount":
      case "propertyCount":
        return b.op === a.op && limitsImply(a, b);
      case "propertyEquals":
        if (b.op === "hasProperty") {
          return a.name === b.name;
        }
        break;
      case "property":
        if (b.op === "property") {
          return a.name === b.name && expressionImplies(a.of, b.of);
        }
        break;
      case "item":
        if (b.op === "item") {
          return a.index === b.index && expressionImplies(a.of, b.of);
        }
        break;
      case "eachItem":
        if (b.op === "eachItem") {
          return "from" in a && "from" in b && a.from <= b.from && expressionImplies(a.of, b.of);
        }
        break;
      case "eachProperty":
        if (b.op === "eachProperty") {
          return !("unevaluated" in a.select) && same(a.select, b.select) && expressionImplies(a.of, b.of);
        }
        break;
      case "eachPropertyName":
        if (b.op === "eachPropertyName") {
          return expressionImplies(a.of, b.of);
        }
        break;
      case "not":
        if (b.op === "not") {
          return expressionImplies(b.of, a.of);
        }
        break;
    }

    return !dependsOnState(a) && same(a, b);
  };

  return expressionImplies;
};

/**
 * Whether an operation passes every instance: `pass`, and what only
 * annotates
 *
 * @type (expression: Expression) => boolean
 */
const alwaysPasses = (expression) => {
  return expression.op === "pass" || expression.op === "annotate" || (expression.op === "format" && !expression.assert);
};

/**
 * Whether a `typeIs`'s types allow a type: they have it, or it's `integer`
 * and they have `number`
 *
 * @type (types: TypeName[], type: TypeName) => boolean
 */
const allowsType = (types, type) => types.includes(type) || (type === "integer" && types.includes("number"));

/**
 * @param {Expression} expression
 * @returns {expression is ExpressionOf<"range" | "stringLength" | "itemCount" | "propertyCount">}
 */
const hasBothLimits = (expression) => {
  return (expression.op === "range" || expression.op === "stringLength" || expression.op === "itemCount" || expression.op === "propertyCount")
    && expression.min !== undefined && expression.max !== undefined;
};

/** @type (expression: ExpressionOf<"range" | "stringLength" | "itemCount" | "propertyCount">, limit: "min" | "max") => Expression */
const withoutLimit = (expression, limit) => {
  /** @type Record<string, unknown> */
  const result = { ...expression };
  delete result[limit];
  delete result[limit === "min" ? "exclusiveMin" : "exclusiveMax"];
  return /** @type Expression */ (result);
};

/**
 * Whether a `range`'s limits are at least as tight as another's
 *
 * @type (a: ExpressionOf<"range">, b: ExpressionOf<"range">) => boolean
 */
const rangeImplies = (a, b) => {
  /** @type (aLimit: number | undefined, aExclusive: boolean | undefined, bLimit: number | undefined, bExclusive: boolean | undefined, direction: 1 | -1) => boolean */
  const tighter = (aLimit, aExclusive, bLimit, bExclusive, direction) => {
    if (bLimit === undefined) {
      return true;
    } else if (aLimit === undefined) {
      return false;
    }
    return aLimit * direction > bLimit * direction || (aLimit === bLimit && (aExclusive === true || bExclusive !== true));
  };

  return tighter(a.min, a.exclusiveMin, b.min, b.exclusiveMin, 1) && tighter(a.max, a.exclusiveMax, b.max, b.exclusiveMax, -1);
};

/**
 * Whether a count's limits are at least as tight as another's
 *
 * @type (a: Limits, b: Limits) => boolean
 */
const limitsImply = (a, b) => {
  return (b.min === undefined || (a.min !== undefined && a.min >= b.min))
    && (b.max === undefined || (a.max !== undefined && a.max <= b.max));
};

/**
 * Whether a value passes an expression, for the operations that can be
 * checked without a schema. It's undefined for the others.
 *
 * @type (value: Json, expression: Expression) => boolean | undefined
 */
const valuePasses = (value, expression) => {
  const type = typeOf(value);
  const domain = domains[expression.op];
  if (domain !== undefined && domain !== type) {
    return true;
  }

  switch (expression.op) {
    case "typeIs":
      return expression.types.includes(type) || (expression.types.includes("integer") && Number.isInteger(value));
    case "equals":
      return equal(value, expression.value);
    case "oneOfValues":
      return expression.values.some((each) => equal(value, each));
    case "not": {
      const result = valuePasses(value, expression.of);
      return result === undefined ? undefined : !result;
    }
    case "range": {
      const number = /** @type number */ (value);
      const { min, max } = expression;
      return (min === undefined || (expression.exclusiveMin ? number > min : number >= min))
        && (max === undefined || (expression.exclusiveMax ? number < max : number <= max));
    }
    case "stringLength":
      return isWithin(codePointLength(/** @type string */ (value)), expression);
    case "itemCount":
      return isWithin(/** @type Json[] */ (value).length, expression);
    case "propertyCount":
      return isWithin(Object.keys(/** @type Record<string, Json> */ (value)).length, expression);
    case "hasProperty":
      return Object.hasOwn(/** @type Record<string, Json> */ (value), expression.name);
    case "propertyEquals": {
      const object = /** @type Record<string, Json> */ (value);
      return Object.hasOwn(object, expression.name) && equal(object[expression.name], expression.value);
    }
  }
};

/** @type (count: number, limits: Limits) => boolean */
const isWithin = (count, { min, max }) => (min === undefined || count >= min) && (max === undefined || count <= max);

/** @type (a: Json, b: Json) => boolean */
const equal = (a, b) => instanceEqual(jsInstance, a, jsInstance, b, false);

/** @type (value: Json) => JsonTypeName */
const typeOf = (value) => {
  if (value === null) {
    return "null";
  } else if (Array.isArray(value)) {
    return "array";
  }
  return /** @type JsonTypeName */ (typeof value);
};

/**
 * Whether an expression's result depends on more than the instance: on
 * what's marked (an `unevaluated` selector), on the dynamic scope, or on
 * an `opaque` operation, which nothing is known about
 *
 * @type (expression: Expression) => boolean
 */
const dependsOnState = (expression) => {
  switch (expression.op) {
    case "opaque":
    case "dynamicApply":
      return true;
    case "eachProperty":
      return "unevaluated" in expression.select || dependsOnState(expression.of);
    case "eachItem":
      return "unevaluated" in expression || dependsOnState(expression.of);
    default:
      return subexpressions(expression).some(dependsOnState);
  }
};

/**
 * Whether two expressions, or two of their fields, are written the same,
 * with an object's properties in any order
 *
 * @type (a: unknown, b: unknown) => boolean
 */
const same = (a, b) => {
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, index) => same(item, b[index]));
  } else if (isObject(a) && isObject(b)) {
    const keys = Object.keys(a);
    return keys.length === Object.keys(b).length && keys.every((key) => key in b && same(a[key], b[key]));
  }
  return a === b;
};

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
const isObject = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
