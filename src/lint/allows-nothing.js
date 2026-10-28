import { canPass } from "./analysis.js";

/**
 * @import { JsonSchemaNode } from "../schema/schema-ast.d.ts"
 * @import { Expression } from "../kernel/kernel.d.ts"
 * @import { LintSchemas } from "./lower.d.ts"
 */

/**
 * Whether no value passes an expression, as far as is known without
 * evaluating it: it's `fail`, or its operations can't pass any type of
 * value together (`canPass`), or it's `all` with one that allows nothing,
 * or `any` or `one` whose every one does, or it applies a subschema that's
 * `false` or whose keywords can't pass any type of value together. With
 * `inside`, a schema it applies that isn't under that location, like one a
 * reference refers to, might allow something.
 *
 * @type (expression: Expression, schemaNodes: Map<string, JsonSchemaNode>, lowered: LintSchemas, inside?: string) => boolean
 */
export const allowsNothing = (expression, schemaNodes, lowered, inside) => {
  switch (expression.op) {
    case "all":
      return expression.of.some((of) => allowsNothing(of, schemaNodes, lowered, inside));
    case "any":
    case "one":
      return expression.of.every((of) => allowsNothing(of, schemaNodes, lowered, inside));
    case "apply":
      break;
    default:
      return canPass(expression).size === 0;
  }

  if (inside !== undefined && !expression.schema.startsWith(`${inside}/`)) {
    return false;
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
