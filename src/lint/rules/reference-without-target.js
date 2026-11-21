import { visit } from "unist-util-visit";
import { documentForLint } from "../document.js";
import { lintRule } from "../lint-rule.js";

/**
 * @import { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts"
 * @import { FindSchemaResult } from "../find-schema.d.ts"
 */

/** @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void> */
const referenceWithoutTarget = lintRule({ origin: "json-schema-lint:reference-without-target", url: "https://hyperjump.io/json-schema/linting/rules/reference-without-target/" }, async (tree, file) => {
  const document = await documentForLint(tree, file);
  if (document === undefined) {
    // The schema wasn't resolved, so there's nothing to find references in
    return;
  }

  visit(tree, "reference", (node) => {
    const result = /** @type FindSchemaResult */ (document.found.get(node.href));
    if (result.status === "missing") {
      // A missing schema is what's found, not a failure, so the reason's cause
      // and stack aren't reported
      file.message(`The reference doesn't find a schema. ${result.reason.message}`, { place: node.position });
    }
  });
});

export default referenceWithoutTarget;
