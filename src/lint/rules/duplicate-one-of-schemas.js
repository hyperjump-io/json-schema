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
const duplicateOneOfSchemas = lintRule({ origin: "json-schema-lint:duplicate-one-of-schemas", url: "https://hyperjump.io/json-schema/linting/rules/duplicate-one-of-schemas/" }, async (tree, file) => {
  const session = file.data.jsonSchemaSession;
  if (session === undefined) {
    return;
  }

  for (const { op, keywordNode, node } of await duplicateSchemas(session, tree)) {
    if (op === "one") {
      const name = keywordNode.children[0].value;
      file.message(`This schema is already in '${name}', so a value it matches always fails '${name}'`, { place: node.position });
    }
  }
});

export default duplicateOneOfSchemas;
