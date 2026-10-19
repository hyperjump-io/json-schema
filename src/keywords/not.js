/**
 * @import { Keyword, SchemaHandle } from "../keyword.d.ts"
 */

/**
 * `not`
 *
 * @type Keyword<SchemaHandle>
 */
export default {
  uri: "https://json-schema.org/keyword/not",
  shape: "schema",
  compile: (valueNode, context) => context.compileSchema(valueNode),
  evaluate(handle, { schema }) {
    const evaluate = schema(handle);
    return (node) => !evaluate(node);
  }
};
