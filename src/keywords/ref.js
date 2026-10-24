/**
 * @import { Keyword, SchemaHandle } from "../keyword.d.ts"
 */

/**
 * `$ref` since 2019-09. It's resolved against the base URI of the schema
 * resource it's in, and the schema it identifies applies to the instance.
 *
 * @type Keyword<SchemaHandle>
 */
export default {
  uri: "https://json-schema.org/keyword/ref",
  shape: "reference",
  compile: (valueNode, context) => context.compileSchema(/** @type {{ href: string }} */ (valueNode).href),
  evaluate: (handle, { schema }) => schema(handle),
  simpleApplicator: true
};
