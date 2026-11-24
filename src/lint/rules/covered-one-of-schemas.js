import { documentForLint } from "../document.js";
import { lintRule } from "../lint-rule.js";
import { coveredSchemas } from "../redundant-schemas.js";

/**
 * @import { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts"
 */

/**
 * The schemas are what `one` applies, compared by what they lower to
 * (`coveredSchemas`), so no keyword is named.
 *
 * @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void>
 */
const coveredOneOfSchemas = lintRule({ origin: "json-schema-lint:covered-one-of-schemas", url: "https://hyperjump.io/json-schema/linting/rules/covered-one-of-schemas/" }, async (tree, file) => {
  const document = await documentForLint(tree, file);
  if (document === undefined) {
    return;
  }

  for (const { keywordNode, node, other } of coveredSchemas(document)) {
    const name = keywordNode.children[0].value;
    const otherSchema = other === undefined ? `another schema in '${name}'` : `'${name}/${other}'`;
    file.message(`A value this schema matches always fails '${name}', because ${otherSchema} matches it too`, { place: node.position });
  }
});

export default coveredOneOfSchemas;
