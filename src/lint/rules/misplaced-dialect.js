import { lintRule } from "../lint-rule.js";

/**
 * @import { Node, Parent } from "unist"
 * @import { JsonSchemaDocumentNode, JsonSchemaKeywordNode, JsonSchemaNode } from "../../schema/schema-ast.d.ts"
 */

const schemaUri = "https://json-schema.org/keyword/schema";

/**
 * The drafts that only allow `$schema` at the document's root. 2019-09 and
 * later allow it at the root of every schema resource.
 *
 * @type Record<string, string>
 */
const rootOnly = {
  "http://json-schema.org/draft-04/schema": "draft-04",
  "http://json-schema.org/draft-06/schema": "draft-06",
  "http://json-schema.org/draft-07/schema": "draft-07"
};

/**
 * Where `$schema` is allowed depends on the dialect of the schema it's in,
 * not the one it names. The resolver ignores it where a schema resource
 * doesn't start, except next to a draft-04–07 `$ref`, where it decides what
 * `$ref` means. A schema resource's root has an empty fragment.
 *
 * @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void>
 */
const misplacedDialect = lintRule({ origin: "json-schema-lint:misplaced-dialect", url: "https://hyperjump.io/json-schema/linting/rules/misplaced-dialect/" }, (tree, file) => {
  /** @type (node: Node, dialectUri: string | undefined) => void */
  const walk = (node, dialectUri) => {
    const schemaNode = /** @type JsonSchemaNode */ (/** @type unknown */ (node));
    const isSchema = schemaNode.type === "json-schema" || schemaNode.type === "reference";
    // A schema that no schema is around, like a Schema Object in an OpenAPI
    // document, is in the dialect it was read in, unless it starts a
    // resource, which OpenAPI allows `$schema` in
    const isResourceRoot = schemaNode.type === "json-schema" && schemaNode.location.endsWith("#");
    const enclosingDialectUri = dialectUri ?? (schemaNode.type === "json-schema" && !isResourceRoot ? schemaNode.dialectUri : undefined);
    if (isSchema && schemaNode.jsonType === "object" && enclosingDialectUri !== undefined && node !== tree.children[0]) {
      for (const property of /** @type JsonSchemaKeywordNode[] */ (schemaNode.children)) {
        const isDialect = schemaNode.type === "reference" ? property.children[0].value === "$schema" : property.keywordUri === schemaUri;
        if (!isDialect) {
          continue;
        }

        const isIgnored = schemaNode.type === "json-schema" && !isResourceRoot;
        const draft = rootOnly[enclosingDialectUri];
        if (draft !== undefined) {
          const consequence = isIgnored ? "It's ignored." : "Other implementations might ignore it.";
          file.message(`'$schema' is only allowed at the root of the document in ${draft}. ${consequence}`, { place: property.position });
        } else if (isIgnored) {
          file.message("'$schema' is only allowed at the root of a schema resource. It's ignored.", { place: property.position });
        }
      }
    }

    // A reference has no dialect, so one in the `definitions` next to a root
    // `$ref` isn't checked
    const childDialectUri = schemaNode.type === "json-schema" ? schemaNode.dialectUri : dialectUri;
    for (const child of /** @type Parent */ (node).children ?? []) {
      walk(child, childDialectUri);
    }
  };

  // The document's root is where `$schema` always belongs, so it's skipped
  walk(tree, undefined);
});

export default misplacedDialect;
