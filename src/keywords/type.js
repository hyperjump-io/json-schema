import { isErrorNode } from "./checks.js";

/**
 * @import { JsonType } from "@hyperjump/browser"
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
 * @type Keyword<SchemaType | SchemaType[], "data">
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

    // The specs say the types must be unique, and v1 that there's at least
    // one, but a duplicate changes nothing and an empty array allows
    // nothing, so `duplicate-array-items` and `empty-array` report them
    for (const itemNode of valueNode.children) {
      if (!isErrorNode(itemNode) && (itemNode.jsonType !== "string" || !types.includes(itemNode.value))) {
        context.message(expectedType, itemNode);
      }
    }
  },
  lower: (type) => ({ op: "typeIs", types: Array.isArray(type) ? type : [type] })
};
