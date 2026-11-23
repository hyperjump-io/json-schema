import { isReferenceSchema } from "../schema/schema-nodes.js";

/**
 * @import { Expression } from "../kernel/kernel.d.ts"
 * @import { JsonSchemaKeywordNode, JsonSchemaNode } from "../schema/schema-ast.d.ts"
 * @import { LintDocument } from "./document.d.ts"
 * @import { LoweredKeyword } from "./lower.d.ts"
 */

/**
 * @typedef {{ type: string; children?: TreeNode[] }} TreeNode
 */

/**
 * @typedef {{
 *   keywordsOf: (node: JsonSchemaNode) => LoweredKeyword[] | undefined;
 *   find: (uri: string) => JsonSchemaNode | undefined;
 *   appliedBy: (keyword: LoweredKeyword) => (handle: string) => JsonSchemaNode | undefined;
 * }} AppliedSchemas
 */

/**
 * What the schemas a keyword applies lower to, for following `apply`. A
 * subschema is applied by its location, and anything else is a reference,
 * which finds what it finds in the document's `found`, into another
 * document too, and is `undefined` if it can't be. `keywordsOf` is what a
 * schema lowers to, in whichever document it's in.
 *
 * @type (document: LintDocument) => AppliedSchemas
 */
export const appliedSchemas = (document) => {
  /** @type AppliedSchemas["find"] */
  const find = (uri) => {
    const result = document.found.get(uri);
    return result?.status === "found" ? result.node : undefined;
  };

  /** @type AppliedSchemas["appliedBy"] */
  const appliedBy = ({ keywordNode, sourceNodes }) => {
    /** @type Map<string, JsonSchemaNode> */
    const subschemas = new Map();
    for (const node of [keywordNode, ...sourceNodes].flatMap((node) => schemasIn(/** @type TreeNode */ (node.children[1])))) {
      if (node.type === "json-schema") {
        subschemas.set(node.location, node);
      }
    }

    return (handle) => subschemas.get(handle) ?? find(handle);
  };

  return { keywordsOf: (node) => document.reached.get(node), find, appliedBy };
};

/**
 * The keyword, of a group's keyword and the siblings it reads, whose value
 * is the schema an expression applies, like `then` for the `apply` of its
 * schema in `if`'s `cases`. It's undefined if the expression doesn't apply
 * a schema that's a whole keyword's value.
 *
 * A schema that's a reference (draft-04 through draft-07's `$ref`) is
 * applied by the URI it resolves to, so it's that keyword's if it's the
 * only one whose reference resolves there. Two that resolve to the same
 * schema can't be told apart.
 *
 * @type (keyword: LoweredKeyword, expression: Expression | null) => JsonSchemaKeywordNode | undefined
 */
export const keywordApplying = ({ keywordNode, sourceNodes }, expression) => {
  if (expression?.op !== "apply") {
    return;
  }

  const applying = [keywordNode, ...sourceNodes].filter((node) => {
    const schemaNode = /** @type JsonSchemaNode */ (node.children[1]);
    return (schemaNode.type === "reference" ? schemaNode.href : schemaNode.location) === expression.schema;
  });
  return applying.length === 1 ? applying[0] : undefined;
};

/**
 * The schemas in a keyword's value, not including their subschemas
 *
 * @type (node: TreeNode) => JsonSchemaNode[]
 */
const schemasIn = (node) => {
  if (node.type === "json-schema" || isReferenceSchema(node)) {
    const schemaNode = /** @type JsonSchemaNode */ (node);
    return [schemaNode];
  }

  return (node.children ?? []).flatMap(schemasIn);
};
