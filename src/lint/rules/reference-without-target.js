import { documentForLint } from "../document.js";
import { lintRule } from "../lint-rule.js";
import { visitReferences } from "../utilities.js";

/**
 * @import { JsonSchemaDocumentNode, JsonSchemaNode } from "../../schema/schema-ast.d.ts"
 * @import { FindSchemaResult } from "../find-schema.d.ts"
 */

/** @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void> */
const referenceWithoutTarget = lintRule({ origin: "json-schema-lint:reference-without-target", url: "https://hyperjump.io/json-schema/linting/rules/reference-without-target/" }, async (tree, file) => {
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
    if (result.status === "missing") {
      // A missing schema is what's found, not a failure, so the reason's cause
      // and stack aren't reported
      file.message(`The reference doesn't find a schema. ${result.reason.message}`, { place: node.position });
    }
  }
});

export default referenceWithoutTarget;
