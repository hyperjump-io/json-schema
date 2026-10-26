import { normalizeIri, parseIri, toAbsoluteIri } from "@hyperjump/uri";
import { lintRule } from "../lint-rule.js";
import { canonicalDialectUri, visitDialectUris } from "../utilities.js";

/**
 * @import { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts"
 */

const v1Uri = "https://json-schema.org/v1";

/** @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void> */
const nonCanonicalDialectUri = lintRule({ origin: "json-schema-lint:non-canonical-dialect-uri", url: "https://hyperjump.io/json-schema/linting/rules/non-canonical-dialect-uri/" }, (tree, file) => {
  visitDialectUris(tree, (valueNode) => {
    let normalized;
    try {
      normalized = normalizeIri(valueNode.value);
    } catch (_error) {
      // It isn't a dialect, which is a problem with the schema
      return;
    }

    const absolute = toAbsoluteIri(normalized);
    if (absolute === v1Uri) {
      // `invalid-dialect-uri` reports v1
      return;
    }

    const fragment = parseIri(normalized).fragment;
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
