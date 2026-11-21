import { visit } from "unist-util-visit";
import { toAbsoluteIri } from "@hyperjump/uri";
import { documentForLint } from "../document.js";
import { lintRule } from "../lint-rule.js";

/**
 * @import { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts"
 * @import { FindSchemaResult } from "../find-schema.d.ts"
 */

/** @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void> */
const referenceByLocation = lintRule({ origin: "json-schema-lint:reference-by-location", url: "https://hyperjump.io/json-schema/linting/rules/reference-by-location/" }, async (tree, file) => {
  const document = await documentForLint(tree, file);
  if (document === undefined) {
    // The schema wasn't resolved, so there's nothing to find references in
    return;
  }

  visit(tree, "reference", (node) => {
    const uri = node.href;
    const result = /** @type FindSchemaResult */ (document.found.get(uri));
    if (result.status !== "found") {
      return;
    }

    // A node's location is its canonical URI, relative to the resource it's
    // in, so a reference that uses another base found it by where it is
    const { location } = result.node;
    const identifier = location.endsWith("#") ? toAbsoluteIri(location) : location;
    if (toAbsoluteIri(identifier) === toAbsoluteIri(uri)) {
      return;
    }

    // Only an identifier that finds the schema is one the reference can use
    const byIdentifier = /** @type FindSchemaResult */ (document.found.get(identifier));
    if (byIdentifier.status !== "found") {
      return;
    }

    file.message(`The reference finds the schema by where it is, not by its identifier, '${identifier}'`, { place: node.position });
  });
});

export default referenceByLocation;
