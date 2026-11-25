/**
 * @import { Json } from "@hyperjump/browser"
 * @import { Expression } from "../kernel/kernel.d.ts"
 * @import { JsonSchemaNode } from "../schema/schema-ast.d.ts"
 * @import { LintSchemas } from "./lower.d.ts"
 */

/**
 * Whether two expressions mean the same, from what they lower to. Schemas
 * they apply in the document are compared the same way, so `true` and `{}`
 * are the same, and so are `{ "const": 1 }` and `{ "enum": [1] }`. A
 * schema's keyword groups are compared in any order. An annotation is also
 * about the keyword it's from, so a group that annotates is the same only
 * as one from the same keyword. A schema that's applied but isn't in the
 * document, or wasn't lowered, is the same only as itself.
 *
 * @type (lowered: LintSchemas, schemaNodes: Map<string, JsonSchemaNode>) => (a: Expression, b: Expression) => boolean
 */
export const sameExpression = (lowered, schemaNodes) => {
  // Pairs of schemas being compared, which are taken to be the same, so a
  // schema that applies itself doesn't recurse forever
  /** @type Set<string> */
  const comparing = new Set();

  /** @type (a: string, b: string) => boolean */
  const sameSchema = (a, b) => {
    const pair = `${a}\0${b}`;
    if (a === b || comparing.has(pair)) {
      return true;
    }

    const aGroups = groupsOf(lowered, schemaNodes, a);
    const bGroups = groupsOf(lowered, schemaNodes, b);
    if (aGroups === undefined || bGroups === undefined || aGroups.length !== bGroups.length) {
      return false;
    }

    comparing.add(pair);
    const unmatched = [...bGroups];
    const result = aGroups.every(([aUri, aExpression]) => {
      const index = unmatched.findIndex(([bUri, bExpression]) => aUri === bUri && same(aExpression, bExpression));
      return index !== -1 && unmatched.splice(index, 1).length > 0;
    });
    comparing.delete(pair);
    return result;
  };

  /** @type (a: Json, b: Json) => boolean */
  const same = (a, b) => {
    if (isApply(a) && isApply(b)) {
      return sameSchema(a.schema, b.schema);
    } else if (Array.isArray(a) && Array.isArray(b)) {
      return a.length === b.length && a.every((item, index) => same(item, b[index]));
    } else if (isObject(a) && isObject(b)) {
      const keys = Object.keys(a);
      return keys.length === Object.keys(b).length && keys.every((key) => key in b && same(a[key], b[key]));
    }

    return a === b;
  };

  return (a, b) => same(/** @type Json */ (a), /** @type Json */ (b));
};

/**
 * A number for an expression that's the same for expressions that are the
 * same ({@link sameExpression}), and usually different for ones that
 * aren't, so only expressions with the same number have to be compared.
 * It's made from what the expression is written as, with each object's
 * properties and each schema's groups in order, and the schemas it applies
 * followed three deep, which is the same for two schemas that apply
 * themselves in different ways and still mean the same.
 *
 * @type (lowered: LintSchemas, schemaNodes: Map<string, JsonSchemaNode>) => (expression: Expression) => number
 */
export const expressionFingerprint = (lowered, schemaNodes) => {
  /** @type Map<string, number>[] */
  const known = Array.from({ length: fingerprintDepth + 1 }, () => new Map());

  /** @type (location: string, depth: number) => number */
  const ofSchema = (location, depth) => {
    let result = known[depth].get(location);
    if (result === undefined) {
      const groups = groupsOf(lowered, schemaNodes, location);
      if (groups === undefined) {
        result = hash(`unknown ${location}`);
      } else {
        const ofGroups = groups.map(([uri, expression]) => `${uri} ${written(/** @type Json */ (expression), depth)}`);
        result = hash(ofGroups.sort().join("\n"));
      }
      known[depth].set(location, result);
    }
    return result;
  };

  /** @type (value: Json, depth: number) => string */
  const written = (value, depth) => {
    if (isApply(value)) {
      return depth === 0 ? "apply" : `apply ${ofSchema(value.schema, depth - 1)}`;
    } else if (Array.isArray(value)) {
      return `[${value.map((item) => written(item, depth)).join(",")}]`;
    } else if (isObject(value)) {
      const keys = Object.keys(value).sort();
      return `{${keys.map((key) => `${JSON.stringify(key)}:${written(value[key], depth)}`).join(",")}}`;
    }
    return JSON.stringify(value);
  };

  return (expression) => hash(written(/** @type Json */ (expression), fingerprintDepth));
};

/** How deep a fingerprint follows the schemas an expression applies */
const fingerprintDepth = 3;

/**
 * A string's FNV-1a hash
 *
 * @type (text: string) => number
 */
const hash = (text) => {
  let result = 0x811c9dc5;
  for (let index = 0; index < text.length; index++) {
    result = Math.imul(result ^ text.charCodeAt(index), 0x01000193);
  }
  return result >>> 0;
};

/**
 * A schema's keyword groups, each with its keyword's URI if it annotates,
 * because an annotation is about the keyword it's from. `true` has none,
 * and `false` is `fail`. It's undefined for a schema that isn't in the
 * document or wasn't lowered.
 *
 * @type (lowered: LintSchemas, schemaNodes: Map<string, JsonSchemaNode>, location: string) => [string, Expression][] | undefined
 */
const groupsOf = (lowered, schemaNodes, location) => {
  const schemaNode = schemaNodes.get(location);
  if (schemaNode?.type !== "json-schema") {
    return;
  } else if (schemaNode.jsonType === "boolean") {
    return schemaNode.value ? [] : [["", { op: "fail" }]];
  }

  return lowered.get(schemaNode)?.map(({ group, keywordNode }) => {
    return [annotates(group.expression) ? keywordNode.keywordUri : "", group.expression];
  });
};

/**
 * Whether an expression annotates, other than in a schema it applies
 *
 * @type (value: Json) => boolean
 */
const annotates = (value) => {
  if (Array.isArray(value)) {
    return value.some(annotates);
  } else if (isObject(value)) {
    return value.op === "annotate" || Object.values(value).some(annotates);
  }
  return false;
};

/**
 * @param {Json} value
 * @returns {value is Record<string, Json>}
 */
const isObject = (value) => typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * @param {Json} value
 * @returns {value is { op: "apply"; schema: string }}
 */
const isApply = (value) => isObject(value) && value.op === "apply" && typeof value.schema === "string";
