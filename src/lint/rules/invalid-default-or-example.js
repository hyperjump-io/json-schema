import { lintRule } from "../lint-rule.js";
import { schemaGroup } from "../schema-group.js";
import { findKeyword, visitSchemas } from "../utilities.js";

/**
 * @import { JsonSchemaDocumentNode, JsonSchemaKeywordNode, JsonSchemaNode, JsonSchemaTolerantNode } from "../../schema/schema-ast.d.ts"
 * @import { Validator } from "../../json-schema.d.ts"
 * @import { JsonSchemaSession } from "../../session.d.ts"
 * @import { SchemaGroup, SchemaLink } from "../schema-group.d.ts"
 */

const defaultUri = "https://json-schema.org/keyword/default";
const examplesUri = "https://json-schema.org/keyword/examples";

/**
 * @typedef {{ schemaNode: JsonSchemaNode; defaultNode?: JsonSchemaKeywordNode; examplesNode?: JsonSchemaKeywordNode }} Annotated
 */

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

/** @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void> */
const invalidDefaultOrExample = lintRule({ origin: "jsonschema-lint:invalid-default-or-example" }, async (tree, file) => {
  const session = file.data.jsonSchemaSession;
  if (session === undefined) {
    // The schema wasn't resolved, so it can't be compiled
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

  /** @type Map<JsonSchemaNode, Promise<Validator | undefined>> */
  const validators = new Map();
  /** @type (schemaNode: JsonSchemaNode) => Promise<Validator | undefined> */
  const validatorFor = (schemaNode) => {
    let validator = validators.get(schemaNode);
    if (validator === undefined) {
      // A schema that can't be compiled, such as one with a reference that
      // can't be retrieved, is reported by other rules, if at all
      validator = compile(session, schemaNode);
      validators.set(schemaNode, validator);
    }
    return validator;
  };

  for (const { schemaNode, defaultNode, examplesNode } of annotated) {
    const validator = await validatorFor(schemaNode);
    if (validator === undefined) {
      continue;
    }

    const group = await schemaGroup(session, tree, schemaNode);
    /** @type [Validator, SchemaLink][] */
    const outer = [];
    for (const [outerNode, link] of outermost(group, schemaNode)) {
      const outerValidator = await validatorFor(outerNode);
      if (outerValidator !== undefined) {
        outer.push([outerValidator, link]);
      }
    }

    /** @type (valueNode: JsonSchemaTolerantNode, label: string) => void */
    const check = (valueNode, label) => {
      if (!validator.validateNode(valueNode)) {
        file.message(`${label} isn't valid against the schema it's in`, { place: valueNode.position });
        return;
      }

      const failed = outer.find(([outerValidator]) => !outerValidator.validateNode(valueNode));
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

/** @type (session: JsonSchemaSession, schemaNode: JsonSchemaNode) => Promise<Validator | undefined> */
const compile = async (session, schemaNode) => {
  try {
    return await session.compile(schemaNode.location);
  } catch {
    return undefined;
  }
};

export default invalidDefaultOrExample;
