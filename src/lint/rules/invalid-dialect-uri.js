import { getFragment, isIri, normalizeIri, toAbsoluteIri } from "@hyperjump/uri";
import { lintRule } from "../lint-rule.js";
import { visitDialectUris } from "../utilities.js";

/**
 * @import { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts"
 */

const v1Uri = "https://json-schema.org/v1";

/** @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void> */
const invalidDialectUri = lintRule({ origin: "json-schema-lint:invalid-dialect-uri", url: "https://hyperjump.io/json-schema/linting/rules/invalid-dialect-uri/" }, (tree, file) => {
  visitDialectUris(tree, (valueNode) => {
    // One that isn't an IRI isn't a dialect, which is a problem with the
    // schema
    if (!isIri(valueNode.value)) {
      return;
    }

    const absolute = toAbsoluteIri(normalizeIri(valueNode.value));
    const hasFragment = getFragment(valueNode.value) !== undefined;

    if (absolute !== v1Uri) {
      return;
    }

    if (hasFragment) {
      file.message(`'$schema' can't have a fragment in v1, not even an empty one. Use '${v1Uri}'.`, { place: valueNode.position });
    } else if (valueNode.value !== v1Uri) {
      file.message(`'$schema' must be normalized in v1. Use '${v1Uri}'.`, { place: valueNode.position });
    }
  });
});

export default invalidDialectUri;
