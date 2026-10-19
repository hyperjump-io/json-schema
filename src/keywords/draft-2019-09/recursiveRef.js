import { jsonValue } from "@hyperjump/browser/json";
import { resolveIri, toAbsoluteIri } from "@hyperjump/uri";
import { iriReference } from "../checks.js";

/**
 * @import { Keyword, SchemaHandle } from "../../keyword.d.ts"
 */

/**
 * `$recursiveRef` in 2019-09. It works like `$ref`, unless the schema it
 * identifies has `$recursiveAnchor: true`, which is a dynamic anchor named
 * `""`. Then the outermost schema in the dynamic scope with
 * `$recursiveAnchor: true` applies instead.
 *
 * @type Keyword<SchemaHandle>
 */
export default {
  uri: "https://json-schema.org/keyword/draft-2019-09/recursiveRef",
  shape: "data",
  check: iriReference,
  compile(valueNode, context) {
    const reference = /** @type string */ (jsonValue(valueNode));
    return context.compileSchema(resolveIri(reference, toAbsoluteIri(context.schemaNode.location)));
  },
  evaluate(handle, context) {
    const evaluate = context.schema(handle);

    const resourceDynamicAnchors = /** @type NonNullable<typeof context.resourceDynamicAnchors> */ (context.resourceDynamicAnchors);
    if (resourceDynamicAnchors(toAbsoluteIri(handle))[""] !== handle) {
      return evaluate;
    }

    // The schema has the anchor itself, so if nothing outer in the dynamic
    // scope does, it applies
    const dynamicAnchor = /** @type NonNullable<typeof context.dynamicAnchor> */ (context.dynamicAnchor);
    return (node) => (dynamicAnchor("") ?? evaluate)(node);
  },
  reads: ["dynamicScope"],
  simpleApplicator: true
};
