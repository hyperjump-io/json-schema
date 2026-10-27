import { findSchema } from "./find-schema.js";
import { lowerForLint } from "./lower.js";

/**
 * @import { JsonSchemaDocumentNode, JsonSchemaNode } from "../schema/schema-ast.d.ts"
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
 * }} AppliedSchemas
 */

/**
 * What the schemas a keyword applies lower to, for following `apply`. A
 * subschema is applied by its location, and anything else is a reference,
 * which is found with `findSchema`, into another document too, and is
 * `undefined` if it can't be.
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

  return { keywordsOf: (node) => schemas.get(node), find, appliedBy };
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
