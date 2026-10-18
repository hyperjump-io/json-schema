import { jsonValue } from "@hyperjump/browser/json";
import { parseIri, resolveIri, toAbsoluteIri } from "@hyperjump/uri";
import keywordSchema from "./dynamicRef.schema.json" with { type: "json" };

/**
 * @import { Keyword, SchemaHandle } from "../../keyword.d.ts"
 */

/**
 * `$dynamicRef` in 2020-12. It works like `$ref`, unless the schema it
 * identifies has a dynamic anchor with the same name as the reference's
 * fragment (bookending). Then the outermost schema in the dynamic scope with
 * that anchor applies instead, if there is one. `fragment` is the
 * reference's plain-name fragment, if it has one.
 *
 * @type Keyword<{ handle: SchemaHandle; fragment: string | null }>
 */
export default {
  uri: "https://json-schema.org/keyword/draft-2020-12/dynamicRef",
  shape: "data",
  schema: keywordSchema,
  async compile(valueNode, context) {
    const reference = /** @type string */ (jsonValue(valueNode));
    const uri = resolveIri(reference, toAbsoluteIri(context.schemaNode.location));
    const handle = await context.compileSchema(uri);
    const { fragment } = parseIri(uri);

    return { handle, fragment: fragment && !fragment.startsWith("/") ? fragment : null };
  },
  evaluate({ handle, fragment }, context) {
    const evaluate = context.schema(handle);
    if (fragment === null) {
      return evaluate;
    }

    // A plain-name fragment identifies the schema it resolved to, so the
    // schema has the dynamic anchor if its resource does
    const resourceDynamicAnchors = /** @type NonNullable<typeof context.resourceDynamicAnchors> */ (context.resourceDynamicAnchors);
    if (!Object.hasOwn(resourceDynamicAnchors(toAbsoluteIri(handle)), fragment)) {
      return evaluate;
    }

    // The schema's own resource has the anchor, so if nothing outer in the
    // dynamic scope does, the schema it resolved to applies
    const dynamicAnchor = /** @type NonNullable<typeof context.dynamicAnchor> */ (context.dynamicAnchor);
    return (node) => (dynamicAnchor(fragment) ?? evaluate)(node);
  },
  reads: ["dynamicScope"],
  simpleApplicator: true
};
