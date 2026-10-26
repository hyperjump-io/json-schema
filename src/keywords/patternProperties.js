import { isRegex } from "@hyperjump/json-schema-formats";
import { all } from "./utilities.js";

/**
 * @import { Keyword } from "../keyword.d.ts"
 * @import { Expression } from "../kernel/kernel.d.ts"
 */

/**
 * `patternProperties`. Patterns are ECMA-262 regular expressions with the
 * `u` flag. A property is evaluated against every pattern it matches.
 *
 * @type Keyword<[string, Expression][], { map: "schema" }>
 */
export default {
  uri: "https://json-schema.org/keyword/patternProperties",
  shape: { map: "schema" },
  check(valueNode, context) {
    if (valueNode.jsonType !== "object") {
      return;
    }

    for (const property of valueNode.children) {
      const nameNode = property.children[0];
      if (!isRegex(nameNode.value)) {
        context.message("Expected a regular expression", nameNode);
      }
    }
  },
  lower: (pairs) => all(pairs.map(([pattern, schema]) => ({ op: "eachProperty", select: { pattern }, of: schema })))
};
