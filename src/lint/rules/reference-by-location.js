import { toAbsoluteIri } from "@hyperjump/uri";
import { documentForLint } from "../document.js";
import { lintRule } from "../lint-rule.js";
import { visitReferences } from "../utilities.js";

/**
 * @import { JsonSchemaDocumentNode, JsonSchemaNode } from "../../schema/schema-ast.d.ts"
 * @import { FindSchemaResult } from "../find-schema.d.ts"
 */

/** @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void> */
const referenceByLocation = lintRule({ origin: "json-schema-lint:reference-by-location", url: "https://hyperjump.io/json-schema/linting/rules/reference-by-location/" }, async (tree, file) => {
  const document = await documentForLint(tree, file);
  if (document === undefined) {
    // The schema wasn't resolved, so there's nothing to find references in
    return;
  }

  /** @type [string, JsonSchemaNode][] */
  const references = [];
  visitReferences(tree, (uri, node) => {
    references.push([uri, node]);
  });

  for (const [uri, node] of references) {
    const result = /** @type FindSchemaResult */ (document.found.get(uri));
    if (result.status !== "found") {
      continue;
    }

    // A node's location is its canonical URI, relative to the resource it's
    // in, so a reference that uses another base found it by where it is
    const identifier = result.node.location.replace(/#$/, "");
    if (toAbsoluteIri(identifier) === toAbsoluteIri(uri)) {
      continue;
    }

    // Only an identifier that finds the schema is one the reference can use
    const byIdentifier = /** @type FindSchemaResult */ (document.found.get(identifier));
    if (byIdentifier.status !== "found") {
      continue;
    }

    file.message(`The reference finds the schema by where it is, not by its identifier, '${identifier}'`, { place: node.position });
  }
});

export default referenceByLocation;
