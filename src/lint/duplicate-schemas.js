import { lowerForLint } from "./lower.js";
import { sameExpression } from "./same-schema.js";
import { visitSchemas } from "./utilities.js";

/**
 * @import { Node } from "unist"
 * @import { JsonSchemaDocumentNode, JsonSchemaKeywordNode, JsonSchemaNode } from "../schema/schema-ast.d.ts"
 * @import { JsonSchemaSession } from "../session.d.ts"
 */

/**
 * A schema in a keyword whose group is `all`, `any`, or `one` of the schemas
 * it applies (`allOf`, `anyOf`, `oneOf`) that's the same as one before it
 * (`sameExpression`), with the keyword and where the schema is. A group of
 * a schema that's applied to nothing else is the schema itself, so it isn't
 * a duplicate.
 *
 * @typedef {{ op: "all" | "any" | "one"; keywordNode: JsonSchemaKeywordNode; node: Node }} Duplicate
 *
 * @type (session: JsonSchemaSession, tree: JsonSchemaDocumentNode) => Promise<Duplicate[]>
 */
export const duplicateSchemas = async (session, tree) => {
  const lowered = await lowerForLint(session, tree);

  /** @type Map<string, JsonSchemaNode> */
  const schemaNodes = new Map();
  visitSchemas(tree, (schemaNode) => {
    schemaNodes.set(schemaNode.location, schemaNode);
  });
  const same = sameExpression(lowered, schemaNodes);

  /** @type Duplicate[] */
  const duplicates = [];
  for (const keywords of lowered.values()) {
    for (const { group, keywordNode } of keywords) {
      const { expression } = group;
      if ((expression.op !== "all" && expression.op !== "any" && expression.op !== "one") || !expression.of.every(({ op }) => op === "apply")) {
        continue;
      }

      // Each schema is where it is in the keyword's value, if that's an array of them
      const valueNode = keywordNode.children[1];
      const itemNodes = valueNode.jsonType === "array" && valueNode.children.length === expression.of.length ? valueNode.children : undefined;
      for (const [index, of] of expression.of.entries()) {
        if (expression.of.slice(0, index).some((earlier) => same(earlier, of))) {
          duplicates.push({ op: expression.op, keywordNode, node: itemNodes?.[index] ?? keywordNode });
        }
      }
    }
  }
  return duplicates;
};
