import { canPass } from "./analysis.js";

/**
 * @import { JsonSchemaNode } from "../schema/schema-ast.d.ts"
 * @import { Expression } from "../kernel/kernel.d.ts"
 * @import { LintSchemas } from "./lower.d.ts"
 */

/**
 * Whether no value passes an expression, as far as is known without
 * evaluating it: it's `fail`, or applies a subschema that's `false` or whose
 * keywords can't pass any type of value together (`canPass`)
 *
 * @type (expression: Expression, schemaNodes: Map<string, JsonSchemaNode>, lowered: LintSchemas) => boolean
 */
export const allowsNothing = (expression, schemaNodes, lowered) => {
  if (expression.op !== "apply") {
    return canPass(expression).size === 0;
  }

  const schemaNode = schemaNodes.get(expression.schema);
  if (schemaNode?.type !== "json-schema") {
    return false;
  } else if (schemaNode.jsonType === "boolean") {
    return !schemaNode.value;
  }

  const keywords = lowered.get(schemaNode);
  return keywords !== undefined && canPass({ op: "all", of: keywords.map(({ group }) => group.expression) }).size === 0;
};
