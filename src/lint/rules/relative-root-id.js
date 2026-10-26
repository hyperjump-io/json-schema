import { isIri, isIriReference } from "@hyperjump/uri";
import { lintRule } from "../lint-rule.js";
import { findKeyword } from "../utilities.js";

/**
 * @import { JsonSchemaDocumentNode, JsonSchemaNode } from "../../schema/schema-ast.d.ts"
 */

const idUris = [
  "https://json-schema.org/keyword/id",
  "https://json-schema.org/keyword/draft-07/id"
];

/** @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void> */
const relativeRootId = lintRule({ origin: "json-schema-lint:relative-root-id", url: "https://hyperjump.io/json-schema/linting/rules/relative-root-id/" }, (tree, file) => {
  for (const child of tree.children) {
    const schemaNode = /** @type JsonSchemaNode */ (child);
    for (const uri of idUris) {
      const keywordNode = findKeyword(schemaNode, uri);
      const valueNode = keywordNode?.children[1];
      if (keywordNode === undefined || valueNode?.jsonType !== "string") {
        continue;
      }

      // An invalid URI is the resolver's problem, and a fragment-only `id` is
      // an anchor, so the root has no identifier
      if (isIri(valueNode.value) || !isIriReference(valueNode.value) || valueNode.value.startsWith("#")) {
        continue;
      }

      const name = keywordNode.children[0].value;
      file.message(`'${valueNode.value}' is relative, so the schema is identified by resolving it against wherever the schema was retrieved from. Give the root '${name}' an absolute URI so the schema has the same identifier wherever it is.`, { place: valueNode.position });
    }
  }
});

export default relativeRootId;
