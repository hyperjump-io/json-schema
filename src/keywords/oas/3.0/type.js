/**
 * @import { Keyword } from "../../../keyword.d.ts"
 */

/**
 * @typedef {"array" | "boolean" | "integer" | "number" | "object" | "string"} OasType
 */

const types = ["array", "boolean", "integer", "number", "object", "string"];

/**
 * `type` in OpenAPI 3.0. It's one type, not an array, and there's no `null`
 * type. The sibling `nullable: true` allows `null` too.
 *
 * @type Keyword<OasType, "data", { nullable: boolean | undefined }>
 */
export default {
  uri: "https://spec.openapis.org/oas/3.0/keyword/type",
  siblings: { nullable: "https://spec.openapis.org/oas/3.0/keyword/nullable" },
  shape: "data",
  check(valueNode, context) {
    if (valueNode.jsonType !== "string" || !types.includes(valueNode.value)) {
      context.message(`Expected one of ${types.map((type) => `'${type}'`).join(", ")}`);
    }
  },
  lower: (type, { nullable }) => ({ op: "typeIs", types: nullable === true ? [type, "null"] : [type] })
};
