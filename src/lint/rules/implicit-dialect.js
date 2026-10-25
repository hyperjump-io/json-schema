import { lintRule } from "../lint-rule.js";
import { canonicalDialectUri, findKeyword } from "../utilities.js";

/**
 * @import { JsonSchemaDocumentNode, JsonSchemaNode } from "../../schema/schema-ast.d.ts"
 */

const schemaUri = "https://json-schema.org/keyword/schema";

/** @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void> */
const implicitDialect = lintRule({ origin: "jsonschema-lint:implicit-dialect", url: "https://hyperjump.io/json-schema/linting/rules/implicit-dialect/" }, (tree, file) => {
  const schemaNode = /** @type JsonSchemaNode | undefined */ (tree.children[0]);
  // Without a dialect, the resolver reports it, and a boolean schema can't
  // have `$schema`
  if (tree.dialectUri === undefined || schemaNode?.jsonType !== "object" || findKeyword(schemaNode, schemaUri)) {
    return;
  }

  const dialectUri = canonicalDialectUri(tree.dialectUri) ?? tree.dialectUri;
  file.message(`The schema doesn't declare its dialect, so it's '${dialectUri}' only because of how it was loaded. Add '"$schema": "${dialectUri}"' so other tools read it the same way.`, { place: schemaNode.position });
});

export default implicitDialect;
