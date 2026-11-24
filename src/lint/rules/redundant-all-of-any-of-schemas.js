import { documentForLint } from "../document.js";
import { lintRule } from "../lint-rule.js";
import { redundantSchemas } from "../redundant-schemas.js";

/**
 * @import { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts"
 */

/**
 * The schemas are what `all`/`any` apply, compared by what they lower to
 * (`redundantSchemas`), so no keyword is named.
 *
 * @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void>
 */
const redundantAllOfAnyOfSchemas = lintRule({ origin: "json-schema-lint:redundant-all-of-any-of-schemas", url: "https://hyperjump.io/json-schema/linting/rules/redundant-all-of-any-of-schemas/" }, async (tree, file) => {
  const document = await documentForLint(tree, file);
  if (document === undefined) {
    return;
  }

  for (const { op, keywordNode, node, other } of redundantSchemas(document)) {
    const name = keywordNode.children[0].value;
    const otherSchema = other === undefined ? `another schema in '${name}'` : `'${name}/${other}'`;
    const reason = op === "all" ? `it allows everything ${otherSchema} allows` : `${otherSchema} allows everything it allows`;
    file.message(`This schema has no effect, because ${reason}`, { place: node.position });
  }
});

export default redundantAllOfAnyOfSchemas;
