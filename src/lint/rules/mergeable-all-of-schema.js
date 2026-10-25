import { readsMarks } from "../../kernel/kernel.js";
import { lintRule } from "../lint-rule.js";
import { lowerForLint } from "../lower.js";
import { visitKeywords } from "../utilities.js";

/**
 * @import { JsonSchemaDocumentNode, JsonSchemaKeywordNode, JsonSchemaNode } from "../../schema/schema-ast.d.ts"
 * @import { JsonSchema } from "../../json-schema.d.ts"
 * @import { Keyword } from "../../keyword.d.ts"
 */

const keyword = "https://json-schema.org/keyword";

/**
 * Keywords that can't be moved because of where they are: `$schema`, which
 * only belongs at a resource's root, and definitions, which are found by
 * their location. Identifiers, which have a `resolve` hook, and keywords
 * that read what their siblings evaluated (their expressions read marks)
 * can't be moved either.
 */
const unmovable = new Set(["schema", "definitions"].map((name) => `${keyword}/${name}`));

/**
 * Keywords that can be in both schemas, because their values combine:
 * `required`'s names, and maps whose entries don't depend on each other, if
 * they don't have a name in common
 *
 * @type Map<string, "names" | "disjoint">
 */
const combinable = new Map(/** @type [string, "names" | "disjoint"][] */ ([
  ["required", "names"],
  ["draft-04/required", "names"],
  ...["properties", "patternProperties", "dependentRequired", "dependentSchemas", "draft-07/dependencies", "draft-04/dependencies"]
    .map((name) => [name, "disjoint"])
]).map(([name, how]) => [`${keyword}/${name}`, how]));

/** @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void> */
const mergeableAllOfSchema = lintRule({ origin: "jsonschema-lint:mergeable-all-of-schema" }, async (tree, file) => {
  const session = file.data.jsonSchemaSession;
  const jsonSchema = session?.jsonSchema;

  /** @type Set<JsonSchemaKeywordNode> */
  const readingMarks = new Set();
  for (const keywords of session === undefined ? [] : (await lowerForLint(session, tree)).values()) {
    for (const { group, keywordNode } of keywords) {
      if (readsMarks(group.expression)) {
        readingMarks.add(keywordNode);
      }
    }
  }

  /**
   * Whether two keywords can't be in the same schema without changing what
   * one of them means, because one reads the other
   *
   * @type (a: string, b: string) => boolean
   */
  const interact = (a, b) => Object.values(definitionOf(jsonSchema, a)?.siblings ?? {}).includes(b)
    || Object.values(definitionOf(jsonSchema, b)?.siblings ?? {}).includes(a);

  /** @type (keywordNode: JsonSchemaKeywordNode) => boolean */
  const isUnmovable = (keywordNode) => {
    const uri = keywordNode.keywordUri;
    const definition = definitionOf(jsonSchema, uri);
    return unmovable.has(uri) || definition?.resolve !== undefined || readingMarks.has(keywordNode);
  };

  visitKeywords(tree, `${keyword}/allOf`, (allOfNode, schemaNode) => {
    const valueNode = allOfNode.children[1];
    if (valueNode.jsonType !== "array" || schemaNode.jsonType !== "object") {
      return;
    }

    const name = allOfNode.children[0].value;

    // The keywords in the schema and in the schemas moved into it so far,
    // with the names in each map
    /** @type Map<string, Set<string>> */
    const merged = new Map();
    /** @type (keywordNode: JsonSchemaKeywordNode) => void */
    const merge = (keywordNode) => {
      const names = merged.get(keywordNode.keywordUri) ?? new Set();
      namesOf(keywordNode).forEach((propertyName) => names.add(propertyName));
      merged.set(keywordNode.keywordUri, names);
    };
    for (const property of /** @type JsonSchemaKeywordNode[] */ (schemaNode.children)) {
      if (property !== allOfNode) {
        merge(property);
      }
    }

    /** @type (keywordNode: JsonSchemaKeywordNode) => boolean */
    const canMove = (keywordNode) => {
      const uri = keywordNode.keywordUri;
      if (isUnmovable(keywordNode) || [...merged.keys()].some((other) => interact(uri, other))) {
        return false;
      }

      const names = merged.get(uri);
      const how = combinable.get(uri);
      return names === undefined
        || how === "names"
        || (how === "disjoint" && namesOf(keywordNode).every((propertyName) => !names.has(propertyName)));
    };

    for (const branch of /** @type JsonSchemaNode[] */ (valueNode.children)) {
      if (branch.type === "reference") {
        // A schema that's a reference (draft-04 through draft-07) replaces the
        // schema it's in, so it can only replace one with nothing else in
        // it. From 2019-09, `$ref` is a keyword like any other.
        if (valueNode.children.length === 1 && merged.size === 0) {
          file.message(`This schema can replace the schema '${name}' is in`, { place: branch.position });
        }
      } else if (branch.jsonType === "object") {
        const keywords = /** @type JsonSchemaKeywordNode[] */ (branch.children);
        if (keywords.every(canMove)) {
          keywords.forEach(merge);
          file.message(`This schema's keywords can be moved into the schema '${name}' is in`, { place: branch.position });
        }
      }
    }
  });
});

export default mergeableAllOfSchema;

/** @type (keywordNode: JsonSchemaKeywordNode) => string[] */
const namesOf = (keywordNode) => {
  const valueNode = keywordNode.children[1];
  return valueNode.jsonType === "object" ? valueNode.children.map((property) => property.children[0].value) : [];
};

/** @type (jsonSchema: JsonSchema | undefined, uri: string) => Keyword | undefined */
const definitionOf = (jsonSchema, uri) => jsonSchema?.hasKeyword(uri) ? jsonSchema.getKeyword(uri) : undefined;
