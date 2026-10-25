import { subexpressions } from "../kernel/kernel.js";

/**
 * @import { Json, JsonType } from "@hyperjump/browser/json"
 * @import { Expression, Op, TypeName } from "../kernel/kernel.d.ts"
 * @import { JsonSchemaKeywordNode } from "../schema/schema-ast.d.ts"
 * @import { LoweredKeyword } from "./lower.d.ts"
 * @import * as API from "./analysis.d.ts"
 */

/** @type JsonType[] */
const jsonTypes = ["null", "boolean", "number", "string", "array", "object"];

/**
 * The one type an operation is about
 *
 * @type Partial<Record<Op, JsonType>>
 */
const domains = {
  range: "number",
  multipleOf: "number",
  stringLength: "string",
  matches: "string",
  itemCount: "array",
  uniqueItems: "array",
  item: "array",
  eachItem: "array",
  contains: "array",
  itemSequence: "array",
  propertyCount: "object",
  hasProperty: "object",
  propertyEquals: "object",
  property: "object",
  eachProperty: "object",
  eachPropertyName: "object"
};

/** @type API.appliesTo */
export const appliesTo = (jsonSchema, expression) => {
  const domain = domains[expression.op];
  if (domain !== undefined) {
    return new Set([domain]);
  }

  switch (expression.op) {
    case "pass":
      return new Set();
    case "all":
    case "any":
    case "one":
      return union(expression.of.map((of) => appliesTo(jsonSchema, of)));
    case "cases": {
      // A case does something only where its condition can pass, and
      // `otherwise` wherever the conditions can fail, which is anywhere
      const cases = expression.cases.map(([condition, then]) => {
        const applies = union([appliesTo(jsonSchema, condition), then === null ? new Set() : appliesTo(jsonSchema, then)]);
        return intersection([canPass(condition), applies]);
      });
      const otherwise = expression.otherwise === null ? new Set() : appliesTo(jsonSchema, expression.otherwise);
      return union([...cases, /** @type Set<JsonType> */ (otherwise)]);
    }
    // A branch applies only to the instances it's for
    case "typeSwitch":
      return union(jsonTypes.map((type) => intersection([new Set([type]), appliesTo(jsonSchema, expression.cases[type] ?? expression.otherwise)])));
    case "propertySwitch":
    case "keySwitch":
      return intersection([new Set(["object"]), union(subexpressions(expression).map((branch) => appliesTo(jsonSchema, branch)))]);
    case "annotate":
      return expression.types === undefined ? all() : jsonTypesOf(expression.types);
    case "format": {
      const types = expression.uri !== null && jsonSchema.hasFormat(expression.uri) ? jsonSchema.getFormat(expression.uri).types : undefined;
      return types === undefined ? all() : new Set(/** @type JsonType[] */ (types));
    }
    case "predicate":
      return jsonTypesOf(expression.types);
    default:
      // `fail`, `not`, `apply`, `dynamicApply`, `typeIs`, `equals`,
      // `oneOfValues`, `opaque`
      return all();
  }
};

/** @type API.keywordAppliesTo */
export const keywordAppliesTo = (jsonSchema, keywords, keywordNode) => {
  /** @type Set<JsonType>[] */
  const types = [];
  for (const { group, keywordNode: groupNode, sourceNodes } of keywords) {
    if (groupNode === keywordNode || sourceNodes.includes(keywordNode)) {
      types.push(appliesTo(jsonSchema, group.expression));
    }
  }

  const applies = union(types);
  return jsonTypes.filter((type) => applies.has(type));
};

/** @type API.canPass */
export const canPass = (expression) => {
  switch (expression.op) {
    case "fail":
      return new Set();
    case "typeIs":
      return jsonTypesOf(expression.types);
    case "equals":
      return new Set([typeOfValue(expression.value)]);
    case "oneOfValues":
      return new Set(expression.values.map(typeOfValue));
    case "all":
      return intersection(expression.of.map(canPass));
    case "any":
    case "one":
      return union(expression.of.map(canPass));
    case "typeSwitch":
      return union(jsonTypes.map((type) => intersection([new Set([type]), canPass(expression.cases[type] ?? expression.otherwise)])));
    case "propertySwitch":
    case "keySwitch": {
      // What isn't an object passes
      const objects = union(subexpressions(expression).map(canPass)).has("object");
      return new Set(jsonTypes.filter((type) => type !== "object" || objects));
    }
    default:
      return all();
  }
};

/**
 * Operations that can fail without a schema. `typeIs`, `equals`,
 * `oneOfValues`, and `format` aren't counted.
 *
 * @type Set<Op>
 */
const assertions = new Set(/** @type Op[] */ ([
  "range", "multipleOf", "stringLength", "matches", "itemCount", "uniqueItems", "propertyCount", "hasProperty", "propertyEquals",
  "predicate"
]));

/** @type API.assertsOnItsOwn */
export const assertsOnItsOwn = (expression) => {
  let asserts = false;
  let applies = false;

  /** @type (expression: Expression) => void */
  const visit = (expression) => {
    if (assertions.has(expression.op)) {
      asserts = true;
    } else if (expression.op === "apply" || expression.op === "dynamicApply" || expression.op === "opaque") {
      applies = true;
    }
    subexpressions(expression).forEach(visit);
  };
  visit(expression);

  return asserts && !applies;
};

/** @type () => Set<JsonType> */
const all = () => new Set(jsonTypes);

/** @type (sets: Set<JsonType>[]) => Set<JsonType> */
const union = (sets) => new Set(sets.flatMap((set) => [...set]));

/** @type (sets: Set<JsonType>[]) => Set<JsonType> */
const intersection = (sets) => sets.reduce((result, set) => new Set([...result].filter((type) => set.has(type))), all());

/** @type (types: TypeName[]) => Set<JsonType> */
const jsonTypesOf = (types) => new Set(types.map((type) => type === "integer" ? "number" : type));

/** @type (value: Json) => JsonType */
const typeOfValue = (value) => {
  if (value === null) {
    return "null";
  } else if (Array.isArray(value)) {
    return "array";
  }

  return /** @type JsonType */ (typeof value);
};
