import { jsonValue } from "@hyperjump/browser/json";
import { resolveIri, toAbsoluteIri } from "@hyperjump/uri";

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
  shape: "data",
  compile(valueNode, context) {
    const reference = /** @type string */ (jsonValue(valueNode));
    return context.compileSchema(resolveIri(reference, toAbsoluteIri(context.schemaNode.location)));
  },
  evaluate: (handle, { schema }) => schema(handle),
  simpleApplicator: true
};
