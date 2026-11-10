import additionalPropertiesKeyword from "../additionalProperties.js";

/**
 * @import { Keyword } from "../../keyword.d.ts"
 * @import { Expression } from "../../kernel/kernel.d.ts"
 */

/**
 * `additionalProperties` in draft-04 through 2020-12. It's the same as
 * `additionalProperties`, with draft-2020-12's `patternProperties` as the
 * sibling it reads.
 *
 * @type Keyword<Expression, "schema", { properties?: [string, Expression][]; patternProperties?: [string, Expression][] }>
 */
export default {
  ...additionalPropertiesKeyword,
  uri: "https://json-schema.org/keyword/draft-2020-12/additionalProperties",
  siblings: {
    ...additionalPropertiesKeyword.siblings,
    patternProperties: "https://json-schema.org/keyword/draft-2020-12/patternProperties"
  }
};
