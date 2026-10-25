import { evaluatorForLint } from "../evaluate.js";
import { lintRule } from "../lint-rule.js";
import { schemaGroup } from "../schema-group.js";
import { findKeyword, visitSchemas } from "../utilities.js";

/**
 * @import { JsonSchemaDocumentNode, JsonSchemaKeywordNode, JsonSchemaNode, JsonSchemaTolerantNode } from "../../schema/schema-ast.d.ts"
 * @import { SchemaGroup, SchemaLink } from "../schema-group.d.ts"
 */

const defaultUri = "https://json-schema.org/keyword/default";
const examplesUri = "https://json-schema.org/keyword/examples";

/**
 * @typedef {{ schemaNode: JsonSchemaNode; defaultNode?: JsonSchemaKeywordNode; examplesNode?: JsonSchemaKeywordNode }} Annotated
 */

/** @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void> */
const invalidDefaultOrExample = lintRule({ origin: "jsonschema-lint:invalid-default-or-example" }, async (tree, file) => {
  const session = file.data.jsonSchemaSession;
  if (session === undefined) {
    // The schema wasn't resolved, so it can't be evaluated
    return;
  }

  /** @type Annotated[] */
  const annotated = [];
  visitSchemas(tree, (schemaNode) => {
    const defaultNode = findKeyword(schemaNode, defaultUri);
    const examplesNode = findKeyword(schemaNode, examplesUri);
    if (defaultNode !== undefined || examplesNode !== undefined) {
      annotated.push({ schemaNode, defaultNode, examplesNode });
    }
  });
  if (annotated.length === 0) {
    return;
  }

  // A value is reported only if it fails. One that might, like one a
  // reference that can't be followed decides, isn't.
  const evaluator = await evaluatorForLint(session, tree);
  for (const { schemaNode, defaultNode, examplesNode } of annotated) {
    const group = await schemaGroup(session, tree, schemaNode);
    const outer = outermost(group, schemaNode);

    /** @type (valueNode: JsonSchemaTolerantNode, label: string) => void */
    const check = (valueNode, label) => {
      if (evaluator.schema(schemaNode, valueNode).valid === false) {
        file.message(`${label} isn't valid against the schema it's in`, { place: valueNode.position });
        return;
      }

      const failed = outer.find(([outerNode]) => evaluator.schema(outerNode, valueNode).valid === false);
      if (failed !== undefined) {
        file.message(`${label} is valid against the schema it's in, but not against the schema that applies it with '${linkName(failed[1])}'`, { place: valueNode.position });
      }
    };

    if (defaultNode !== undefined) {
      check(defaultNode.children[1], `The '${defaultNode.children[0].value}' value`);
    }

    const examplesValue = examplesNode?.children[1];
    if (examplesValue?.jsonType === "array") {
      for (const itemNode of examplesValue.children) {
        check(itemNode, "This example");
      }
    }
  }
});

export default invalidDefaultOrExample;

/**
 * The outermost schemas that apply a schema in place, through `allOf`,
 * `$ref`, and so on, each with the link from it toward the schema. A value
 * valid where it's used is valid against them. Paths through `not` or `if`
 * aren't followed.
 *
 * @type (group: SchemaGroup, schemaNode: JsonSchemaNode) => [JsonSchemaNode, SchemaLink][]
 */
const outermost = (group, schemaNode) => {
  /** @type Map<JsonSchemaNode, SchemaLink> */
  const result = new Map();
  const seen = new Set([schemaNode]);

  /** @type (node: JsonSchemaNode, firstLink: SchemaLink | undefined) => void */
  const walk = (node, firstLink) => {
    const incoming = group.links.filter((link) => link.to === node);
    if (incoming.length === 0 && firstLink !== undefined && !result.has(node)) {
      result.set(node, firstLink);
    }

    for (const link of incoming) {
      // A schema applied through `not` or as a condition doesn't have to
      // pass, so a value in it isn't meant to be valid against the schema
      // that applies it
      if (!link.negated && !link.condition && !seen.has(link.from)) {
        seen.add(link.from);
        walk(link.from, link);
      }
    }
  };
  walk(schemaNode, undefined);

  return [...result];
};

/** @type (link: SchemaLink) => string */
const linkName = (link) => findKeyword(link.from, link.keywordUri)?.children[0].value ?? "$ref";
