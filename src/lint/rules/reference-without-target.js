import { lintRule } from "../lint-rule.js";
import { findSchema } from "../find-schema.js";
import { visitReferences } from "../utilities.js";

/**
 * @import { JsonSchemaDocumentNode, JsonSchemaNode } from "../../schema/schema-ast.d.ts"
 */

/** @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void> */
const referenceWithoutTarget = lintRule({ origin: "json-schema-lint:reference-without-target", url: "https://hyperjump.io/json-schema/linting/rules/reference-without-target/" }, async (tree, file) => {
  const session = file.data.jsonSchemaSession;
  if (session === undefined) {
    // The schema wasn't resolved, so there's nothing to find references in
    return;
  }

  /** @type [string, JsonSchemaNode][] */
  const references = [];
  visitReferences(tree, (uri, node) => {
    references.push([uri, node]);
  });

  for (const [uri, node] of references) {
    const result = await findSchema(session, uri, { document: tree });
    if (result.status === "missing") {
      // A missing schema is what's found, not a failure, so the reason's cause
      // and stack aren't reported
      file.message(`The reference doesn't find a schema. ${result.reason.message}`, { place: node.position });
    }
  }
});

export default referenceWithoutTarget;
