import { visit } from "unist-util-visit";
import { expressionFingerprint, sameExpression } from "./same-schema.js";

/**
 * @import { Node } from "unist"
 * @import { Expression } from "../kernel/kernel.d.ts"
 * @import { JsonSchemaKeywordNode, JsonSchemaNode } from "../schema/schema-ast.d.ts"
 * @import { LintDocument } from "./document.d.ts"
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
 * @type (document: LintDocument) => Duplicate[]
 */
export const duplicateSchemas = ({ tree, schemas: lowered }) => {
  /** @type Map<string, JsonSchemaNode> */
  const schemaNodes = new Map();
  visit(tree, "json-schema", (node) => {
    const schemaNode = /** @type JsonSchemaNode */ (node);
    schemaNodes.set(schemaNode.location, schemaNode);
  });
  const same = sameExpression(lowered, schemaNodes);
  const fingerprint = expressionFingerprint(lowered, schemaNodes);

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
      // Only the earlier schemas with the same fingerprint are compared,
      // so a long `anyOf` doesn't have every pair compared
      /** @type Map<number, Expression[]> */
      const earlier = new Map();
      for (const [index, of] of expression.of.entries()) {
        const key = fingerprint(of);
        const alike = earlier.get(key) ?? [];
        if (alike.some((other) => same(other, of))) {
          duplicates.push({ op: expression.op, keywordNode, node: itemNodes?.[index] ?? keywordNode });
        }
        alike.push(of);
        earlier.set(key, alike);
      }
    }
  }
  return duplicates;
};
