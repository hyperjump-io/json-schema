/**
 * @import { Keyword } from "../keyword.d.ts"
 * @import { Expression } from "../kernel/kernel.d.ts"
 */

/**
 * `conditional`. It's a list of conditions, each followed by the schema that
 * applies if it passes. The first condition that passes decides. A schema
 * at the end without a condition applies if none pass. Conditions and their
 * schemas can be grouped in arrays, which are flattened.
 *
 * @type Keyword<(Expression | Expression[])[], { array: ["schema", { array: "schema" }] }>
 */
export default {
  uri: "https://json-schema.org/keyword/conditional",
  shape: { array: ["schema", { array: "schema" }] },
  lower(items) {
    // Conditions are followed by the schema that applies if they pass
    const schemas = items.flatMap((item) => Array.isArray(item) ? item : [item]);

    /** @type [Expression, Expression][] */
    const cases = [];
    for (let index = 0; index + 1 < schemas.length; index += 2) {
      cases.push([schemas[index], schemas[index + 1]]);
    }

    return { op: "cases", cases, otherwise: schemas.length % 2 === 1 ? /** @type Expression */ (schemas.at(-1)) : null };
  }
};
