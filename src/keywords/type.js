/**
 * @import { JsonType } from "@hyperjump/browser/json"
 * @import { Keyword } from "../keyword.d.ts"
 */

/**
 * @typedef {JsonType | "integer"} SchemaType
 */

/**
 * `type`. A number with no fractional part is an `integer`, including one
 * written like `1.0`.
 *
 * @type Keyword<SchemaType | SchemaType[]>
 */
export default {
  uri: "https://json-schema.org/keyword/type",
  shape: "data",
  valueSchema: new URL("./type.schema.json", import.meta.url).href,
  evaluate(type, { instance }) {
    /** @type Set<string> */
    const types = new Set(Array.isArray(type) ? type : [type]);
    const allowsInteger = types.has("integer");

    return (node) => {
      const nodeType = instance.typeOf(node);
      if (nodeType === undefined || types.has(nodeType)) {
        return true;
      }

      return allowsInteger && nodeType === "number" && Number.isInteger(instance.value(node));
    };
  }
};
