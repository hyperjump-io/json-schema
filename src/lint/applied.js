import { findSchema } from "./find-schema.js";
import { lowerForLint } from "./lower.js";

/**
 * @import { Expression } from "../kernel/kernel.d.ts"
 * @import { JsonSchemaDocumentNode, JsonSchemaKeywordNode, JsonSchemaNode } from "../schema/schema-ast.d.ts"
 * @import { JsonSchemaSession } from "../session.d.ts"
 * @import { LintSchemas, LoweredKeyword } from "./lower.d.ts"
 */

/**
 * @typedef {{ type: string; children?: TreeNode[] }} TreeNode
 */

/**
 * @typedef {{
 *   keywordsOf: (node: JsonSchemaNode) => LoweredKeyword[] | undefined;
 *   find: (uri: string) => Promise<JsonSchemaNode | undefined>;
 *   appliedBy: (keyword: LoweredKeyword) => (handle: string) => Promise<JsonSchemaNode | undefined>;
 *   lowered: (node: JsonSchemaNode) => Promise<LoweredKeyword[] | undefined>;
 * }} AppliedSchemas
 */

/**
 * What the schemas a keyword applies lower to, for following `apply`. A
 * subschema is applied by its location, and anything else is a reference,
 * which is found with `findSchema`, into another document too, and is
 * `undefined` if it can't be. `lowered` is what a schema lowers to, in
 * whichever document it's in.
 *
 * @type (session: JsonSchemaSession, tree: JsonSchemaDocumentNode) => Promise<AppliedSchemas>
 */
export const appliedSchemas = async (session, tree) => {
  /** @type LintSchemas */
  const schemas = new Map(await lowerForLint(session, tree));

  /** @type AppliedSchemas["find"] */
  const find = async (uri) => {
    const result = await findSchema(session, uri, { document: tree });
    if (result.status !== "found") {
      return undefined;
    } else if (!schemas.has(result.node)) {
      for (const [schemaNode, keywords] of await lowerForLint(session, result.document)) {
        schemas.set(schemaNode, keywords);
      }
    }
    return result.node;
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

    return async (handle) => subschemas.get(handle) ?? await find(handle);
  };

  /** @type AppliedSchemas["lowered"] */
  const lowered = async (node) => {
    if (!schemas.has(node)) {
      await find(node.location);
    }
    return schemas.get(node);
  };

  return { keywordsOf: (node) => schemas.get(node), find, appliedBy, lowered };
};

/**
 * The keyword, of a group's keyword and the siblings it reads, whose value
 * is the schema an expression applies, like `then` for the `apply` of its
 * schema in `if`'s `cases`. It's undefined if the expression doesn't apply
 * a schema that's a whole keyword's value.
 *
 * @type (keyword: LoweredKeyword, expression: Expression | null) => JsonSchemaKeywordNode | undefined
 */
export const keywordApplying = ({ keywordNode, sourceNodes }, expression) => {
  if (expression?.op !== "apply") {
    return;
  }
  return [keywordNode, ...sourceNodes].find((node) => /** @type JsonSchemaNode */ (node.children[1]).location === expression.schema);
};

/**
 * The schemas in a keyword's value, not including their subschemas
 *
 * @type (node: TreeNode) => JsonSchemaNode[]
 */
const schemasIn = (node) => {
  if (node.type === "json-schema" || node.type === "reference") {
    const schemaNode = /** @type JsonSchemaNode */ (node);
    return [schemaNode];
  }

  return (node.children ?? []).flatMap(schemasIn);
};
