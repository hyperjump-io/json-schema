import { subexpressions } from "../kernel/kernel.js";

/**
 * @import { Json, JsonType } from "@hyperjump/browser/json"
 * @import { Expression, Op, Selector, TypeName } from "../kernel/kernel.d.ts"
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
export const appliesTo = (document, expression) => {
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
      return union(expression.of.map((of) => appliesTo(document, of)));
    case "cases": {
      // A case does something only where its condition can pass, and
      // `otherwise` wherever the conditions can fail, which is anywhere
      const cases = expression.cases.map(([condition, then]) => {
        const applies = union([appliesTo(document, condition), then === null ? new Set() : appliesTo(document, then)]);
        return intersection([canPass(condition), applies]);
      });
      const otherwise = expression.otherwise === null ? new Set() : appliesTo(document, expression.otherwise);
      return union([...cases, /** @type Set<JsonType> */ (otherwise)]);
    }
    // A branch applies only to the instances it's for
    case "typeSwitch":
      return union(jsonTypes.map((type) => intersection([new Set([type]), appliesTo(document, expression.cases[type] ?? expression.otherwise)])));
    case "propertySwitch":
    case "keySwitch":
      return intersection([new Set(["object"]), union(subexpressions(expression).map((branch) => appliesTo(document, branch)))]);
    case "annotate":
      return expression.types === undefined ? all() : jsonTypesOf(expression.types);
    case "format": {
      const types = expression.uri === null ? undefined : document.definitions.formats[expression.uri]?.types;
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
export const keywordAppliesTo = (document, keywords, keywordNode) => {
  /** @type Set<JsonType>[] */
  const types = [];
  for (const { group, keywordNode: groupNode, sourceNodes } of keywords) {
    if (groupNode === keywordNode || sourceNodes.includes(keywordNode)) {
      types.push(appliesTo(document, group.expression));
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

/** @type API.operationsOf */
export const operationsOf = (expression) => expression.op === "all" ? expression.of : [expression];

/** @type API.dependsOn */
export const dependsOn = (condition) => {
  const operations = operationsOf(condition)
    .filter((operation) => operation.op !== "typeIs" || operation.types.length !== 1 || operation.types[0] !== "object");
  return operations.length === 1 && operations[0].op === "hasProperty" ? operations[0].name : undefined;
};

/** @type API.typeIsOf */
export const typeIsOf = (keywords) => {
  /** @type {{ keywordNode: JsonSchemaKeywordNode; types: Set<TypeName> }[]} */
  const found = [];
  for (const { group, keywordNode } of keywords) {
    if (group.expression.op === "typeIs") {
      found.push({ keywordNode, types: new Set(group.expression.types) });
    }
  }

  if (found.length === 0) {
    return;
  }

  // A type is allowed if every keyword allows it, and `number` allows `integer`
  const named = new Set(found.flatMap(({ types }) => [...types]));
  const types = new Set([...named].filter((type) => found.every((keyword) => allowsType(keyword.types, type))));
  return { keywords: found, types };
};

/**
 * Whether a `typeIs`'s types allow a type: they have it, or it's `integer`
 * and they have `number`
 *
 * @type (types: Set<TypeName>, type: TypeName) => boolean
 */
const allowsType = (types, type) => types.has(type) || (type === "integer" && types.has("number"));

/** @type API.selects */
export const selects = (select, name) => {
  if ("pattern" in select) {
    return compilePattern(select.pattern)?.test(name);
  } else if ("except" in select) {
    const regExps = select.except.patterns.map(compilePattern);
    if (regExps.includes(null)) {
      return;
    }
    return !select.except.names.includes(name) && !regExps.some((regExp) => regExp?.test(name));
  }
};

/** @type API.propertyOperations */
export const propertyOperations = (keywords, name) => {
  /** @type ReturnType<API.propertyOperations> */
  const result = [];
  for (const keyword of keywords) {
    for (const operation of operationsOf(keyword.group.expression)) {
      if (operation.op === "property" && operation.name === name) {
        result.push({ keyword, of: operation.of });
      } else if (operation.op === "eachProperty" && !("unevaluated" in operation.select)) {
        const selected = selects(operation.select, name);
        if (selected === undefined) {
          return;
        } else if (selected) {
          result.push({ keyword, of: operation.of });
        }
      }
    }
  }
  return result;
};

/** @type Map<string, RegExp | null> */
const patterns = new Map();

/**
 * A pattern as the kernel compiles it, with the `u` flag. It's null if the
 * pattern isn't valid.
 *
 * @type (pattern: string) => RegExp | null
 */
const compilePattern = (pattern) => {
  let regExp = patterns.get(pattern);
  if (regExp === undefined) {
    try {
      regExp = new RegExp(pattern, "u");
    } catch {
      regExp = null;
    }
    patterns.set(pattern, regExp);
  }

  return regExp;
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
