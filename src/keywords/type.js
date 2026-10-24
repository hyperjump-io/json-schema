import { isErrorNode } from "./checks.js";

/**
 * @import { JsonType } from "@hyperjump/browser/json"
 * @import { Keyword } from "../keyword.d.ts"
 */

/**
 * @typedef {JsonType | "integer"} SchemaType
 */

const types = ["null", "boolean", "object", "array", "number", "string", "integer"];
const expectedType = `Expected one of ${types.map((type) => `'${type}'`).join(", ")}`;

/**
 * `type`. A number with no fractional part is an `integer`, including one
 * written like `1.0`.
 *
 * @type Keyword<SchemaType | SchemaType[]>
 */
export default {
  uri: "https://json-schema.org/keyword/type",
  shape: "data",
  check(valueNode, context) {
    if (valueNode.jsonType !== "array") {
      if (valueNode.jsonType !== "string" || !types.includes(valueNode.value)) {
        context.message(`${expectedType}, or an array of them`);
      }
      return;
    }

    if (valueNode.children.length === 0) {
      context.message("Expected at least one type");
    }

    const seen = new Set();
    for (const itemNode of valueNode.children) {
      if (isErrorNode(itemNode)) {
        continue;
      } else if (itemNode.jsonType !== "string" || !types.includes(itemNode.value)) {
        context.message(expectedType, itemNode);
      } else if (seen.has(itemNode.value)) {
        context.message(`'${itemNode.value}' is a duplicate`, itemNode);
      } else {
        seen.add(itemNode.value);
      }
    }
  },
  lower: (type) => ({ op: "typeIs", types: Array.isArray(type) ? type : [type] })
};
