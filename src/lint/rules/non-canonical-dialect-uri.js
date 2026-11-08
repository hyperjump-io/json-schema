import { getFragment, isIri, normalizeIri, toAbsoluteIri } from "@hyperjump/uri";
import { lintRule } from "../lint-rule.js";
import { canonicalDialectUri, visitDialectUris } from "../utilities.js";

/**
 * @import { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts"
 */

/** @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void> */
const nonCanonicalDialectUri = lintRule({ origin: "json-schema-lint:non-canonical-dialect-uri", url: "https://hyperjump.io/json-schema/linting/rules/non-canonical-dialect-uri/" }, (tree, file) => {
  visitDialectUris(tree, (valueNode) => {
    // One that isn't an IRI isn't a dialect, which is a problem with the
    // schema
    if (!isIri(valueNode.value)) {
      return;
    }

    const normalized = normalizeIri(valueNode.value);
    const absolute = toAbsoluteIri(normalized);
    const fragment = getFragment(normalized);
    const expected = canonicalDialectUri(absolute) ?? (fragment ? absolute : normalized);
    if (fragment) {
      file.message(`The fragment '#${fragment}' isn't part of the dialect. Use '${expected}'.`, { place: valueNode.position });
    } else if (normalized !== valueNode.value) {
      file.message(`'${valueNode.value}' isn't normalized, so implementations that compare dialect URIs as strings won't recognize it. Use '${expected}'.`, { place: valueNode.position });
    } else if (expected !== valueNode.value) {
      file.message(`'${valueNode.value}' should be '${expected}', the URI its meta-schema identifies itself with. Implementations that compare dialect URIs as strings won't recognize it.`, { place: valueNode.position });
    }
  });
});

export default nonCanonicalDialectUri;
