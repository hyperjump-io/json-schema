/**
 * @import { Json } from "@hyperjump/browser/json"
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

  /** @type (location: string) => [string, Expression][] | undefined */
  const groupsOf = (location) => {
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

  /** @type (a: string, b: string) => boolean */
  const sameSchema = (a, b) => {
    const pair = `${a}\0${b}`;
    if (a === b || comparing.has(pair)) {
      return true;
    }

    const aGroups = groupsOf(a);
    const bGroups = groupsOf(b);
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

/** @type (value: Json) => value is Record<string, Json> */
const isObject = (value) => typeof value === "object" && value !== null && !Array.isArray(value);

/** @type (value: Json) => value is { op: "apply"; schema: string } */
const isApply = (value) => isObject(value) && value.op === "apply" && typeof value.schema === "string";
