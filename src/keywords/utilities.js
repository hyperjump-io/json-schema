import { astInstance } from "../kernel/instance.js";

/**
 * @import { Json } from "@hyperjump/browser/json"
 * @import { InstanceOps, Keyword } from "../keyword.d.ts"
 * @import { Expression } from "../kernel/kernel.d.ts"
 * @import { JsonSchemaKeywordNode, JsonSchemaNode, JsonSchemaTolerantNode } from "../schema/schema-ast.d.ts"
 * @import { InstanceNode } from "../kernel/instance.js"
 */

/**
 * A keyword whose value is an annotation for every instance it applies to,
 * like `title`. It never fails.
 *
 * @type <V extends Json>(uri: string, check?: Keyword["check"]) => Keyword<V, "data">
 */
export const annotationKeyword = (uri, check) => ({
  uri: uri,
  shape: "data",
  check: check,
  lower: (value) => ({ op: "annotate", value })
});

/**
 * `all` of expressions. A keyword that says several things lowers to
 * several operations, and the normal form flattens them.
 *
 * @type (of: Expression[]) => Expression
 */
export const all = (of) => ({ op: "all", of });

/**
 * A condition about a property. An operation passes instances it doesn't
 * apply to, so a condition has to say the instance is an object, or it
 * would pass every string and array.
 *
 * @type (condition: Expression, then: Expression) => Expression
 */
export const whenProperty = (condition, then) => ({
  op: "cases",
  cases: [[{ op: "all", of: [{ op: "typeIs", types: ["object"] }, condition] }, then]],
  otherwise: null
});

/** @type (name: string) => Expression */
export const hasProperty = (name) => ({ op: "hasProperty", name });

/**
 * The values of the siblings a keyword declares, by the names it gives them,
 * for `context.siblings`. A sibling that isn't in the schema is undefined.
 *
 * @type <N extends JsonSchemaNode | JsonSchemaTolerantNode>(schemaNode: N, siblings: Record<string, string> | undefined) => Record<string, N | undefined>
 */
export const siblingValues = (schemaNode, siblings = {}) => {
  /** @type Record<string, any> */
  const values = {};
  for (const [name, keywordUri] of Object.entries(siblings)) {
    values[name] = undefined;
    if (schemaNode.jsonType === "object") {
      const property = /** @type JsonSchemaKeywordNode[] */ (schemaNode.children).find((property) => property.keywordUri === keywordUri);
      values[name] = property?.children[1];
    }
  }
  return values;
};

/**
 * Whether two instances are equal, comparing objects without regard to
 * property order. Each is looked at through its own instance operations, so
 * an instance can be compared to a plain value (`jsInstance`) and an AST
 * isn't copied.
 *
 * Whether a value that couldn't be parsed is equal to anything is unknown.
 * `unparsed` is the result for one. Keywords pass whichever result makes
 * them pass, so the syntax error is the only error reported for it.
 *
 * @template A
 * @template B
 * @param {InstanceOps<A>} aOps
 * @param {A} a
 * @param {InstanceOps<B>} bOps
 * @param {B} b
 * @param {boolean} unparsed
 * @returns {boolean}
 */
export const instanceEqual = (aOps, a, bOps, b, unparsed) => {
  const aType = aOps.typeOf(a);
  const bType = bOps.typeOf(b);
  if (aType === undefined || bType === undefined) {
    return unparsed;
  } else if (aType !== bType) {
    return false;
  }

  switch (aType) {
    case "array": {
      if (aOps.length(a) !== bOps.length(b)) {
        return false;
      }

      let index = 0;
      for (const aItem of aOps.items(a)) {
        const bItem = /** @type B */ (bOps.get(b, index++));
        if (!instanceEqual(aOps, aItem, bOps, bItem, unparsed)) {
          return false;
        }
      }

      return true;
    }
    case "object": {
      if (aOps.length(a) !== bOps.length(b)) {
        return false;
      }

      for (const [name, aValue] of aOps.entries(a)) {
        if (!bOps.has(b, name)) {
          return false;
        }

        const bValue = /** @type B */ (bOps.get(b, name));
        if (!instanceEqual(aOps, aValue, bOps, bValue, unparsed)) {
          return false;
        }
      }

      return true;
    }
    default:
      return aOps.value(a) === bOps.value(b);
  }
};

/**
 * The length of a string in code points, which is how JSON Schema counts
 * string length
 *
 * @type (value: string) => number
 */
export const codePointLength = (value) => {
  let length = 0;
  for (let index = 0; index < value.length; index++) {
    // A code point outside the BMP takes two code units
    if (/** @type number */ (value.codePointAt(index)) > 0xFFFF) {
      index++;
    }
    length++;
  }

  return length;
};

/**
 * The items of an array node that are equal to an item before them, compared
 * as `instanceEqual` does. Items that couldn't be parsed aren't equal to
 * anything, so they're never duplicates.
 *
 * @type (arrayNode: JsonSchemaTolerantNode & { jsonType: "array" }) => JsonSchemaTolerantNode[]
 */
export const duplicateItems = (arrayNode) => {
  // Primitives are compared with a lookup. Only arrays and objects need
  // instanceEqual.
  const primitives = new Set();
  /** @type InstanceNode[] */
  const structured = [];
  /** @type JsonSchemaTolerantNode[] */
  const duplicates = [];
  for (const itemNode of arrayNode.children) {
    const item = /** @type InstanceNode */ (itemNode);
    const type = astInstance.typeOf(item);
    let isDuplicate;
    if (type === undefined) {
      // Already reported as a syntax error
      continue;
    } else if (type === "array" || type === "object") {
      isDuplicate = structured.some((seen) => instanceEqual(astInstance, item, astInstance, seen, false));
      structured.push(item);
    } else {
      const value = astInstance.value(item);
      isDuplicate = primitives.has(value);
      primitives.add(value);
    }

    if (isDuplicate) {
      duplicates.push(/** @type JsonSchemaTolerantNode */ (itemNode));
    }
  }

  return duplicates;
};
