import { duplicateSchemas } from "../duplicate-schemas.js";
import { lintRule } from "../lint-rule.js";

/**
 * @import { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts"
 */

/**
 * The schemas are what `all`/`any`/`one` apply, compared by what they lower
 * to (`duplicateSchemas`), so no keyword is named.
 *
 * @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void>
 */
const duplicateAllOfAnyOfSchemas = lintRule({ origin: "json-schema-lint:duplicate-all-of-any-of-schemas", url: "https://hyperjump.io/json-schema/linting/rules/duplicate-all-of-any-of-schemas/" }, async (tree, file) => {
  const session = file.data.jsonSchemaSession;
  if (session === undefined) {
    return;
  }

  for (const { op, keywordNode, node } of await duplicateSchemas(session, tree)) {
    if (op !== "one") {
      const name = keywordNode.children[0].value;
      file.message(`This schema is already in '${name}', so it has no effect`, { place: node.position });
    }
  }
});

export default duplicateAllOfAnyOfSchemas;
