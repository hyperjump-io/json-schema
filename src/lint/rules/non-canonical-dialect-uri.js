import { normalizeIri, parseIri, toAbsoluteIri } from "@hyperjump/uri";
import { lintRule } from "../lint-rule.js";
import { visitDialectUris } from "../utilities.js";

/**
 * @import { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts"
 */

const v1Uri = "https://json-schema.org/v1";

/** Each official dialect's URI as its meta-schema identifies itself, by the URI without a fragment */
const canonicalUris = new Map([
  "http://json-schema.org/draft-04/schema#",
  "http://json-schema.org/draft-06/schema#",
  "http://json-schema.org/draft-07/schema#",
  "https://json-schema.org/draft/2019-09/schema",
  "https://json-schema.org/draft/2020-12/schema"
].map((uri) => [uri.replace(/#$/, ""), uri]));

/** @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void> */
const nonCanonicalDialectUri = lintRule({ origin: "jsonschema-lint:non-canonical-dialect-uri" }, (tree, file) => {
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
    const expected = canonicalUris.get(absolute) ?? (fragment ? absolute : normalized);
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
