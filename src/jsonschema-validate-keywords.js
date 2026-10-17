import { keywordDefinitionUri } from "./compile.js";

/**
 * @import { JsonErrorNode } from "@hyperjump/browser/json"
 * @import { JsonSchema, Validator } from "./json-schema.d.ts"
 * @import { JsonSchemaKeywordNode, JsonSchemaTolerantNode } from "./schema-ast.d.ts"
 * @import * as API from "./jsonschema-validate-keywords.d.ts"
 */

/**
 * Value schemas are compiled once for each `JsonSchema`, by URI
 *
 * @type WeakMap<JsonSchema, Map<string, Promise<Validator>>>
 */
const validatorCache = new WeakMap();

/** @type (jsonSchema: JsonSchema, valueSchemaUri: string) => Promise<Validator> */
const valueSchemaValidator = (jsonSchema, valueSchemaUri) => {
  let validators = validatorCache.get(jsonSchema);
  if (validators === undefined) {
    validators = new Map();
    validatorCache.set(jsonSchema, validators);
  }

  let validator = validators.get(valueSchemaUri);
  if (validator === undefined) {
    validator = jsonSchema.compile(valueSchemaUri);
    validators.set(valueSchemaUri, validator);
  }

  return validator;
};

/** @type API.jsonSchemaValidateKeywords */
export function jsonSchemaValidateKeywords(options) {
  return async (tree, file) => {
    const { jsonSchema } = options;

    for (const property of keywordProperties(/** @type JsonSchemaTolerantNode | undefined */ (tree.children[0]))) {
      const keywordUri = keywordDefinitionUri(property.keywordUri);
      if (!jsonSchema.hasKeyword(keywordUri)) {
        continue;
      }

      const [nameNode, valueNode] = property.children;
      const validator = await valueSchemaValidator(jsonSchema, jsonSchema.getKeyword(keywordUri).valueSchema);
      const output = validator.validateNode(valueNode, { output: "BASIC" });
      if (!output.valid) {
        file.message(`The value of '${nameNode.value}' isn't valid`, {
          place: valueNode.position,
          ruleId: keywordUri,
          source: "json-schema",
          cause: new AggregateError(output.errors, `The value of '${nameNode.value}' doesn't match the keyword's value schema`)
        });
      }
    }

    return tree;
  };
}

/**
 * Every property of a schema in the tree that's a keyword, including the
 * keywords of subschemas
 *
 * @type (node: JsonSchemaTolerantNode | JsonErrorNode | undefined) => Generator<JsonSchemaKeywordNode<JsonErrorNode>>
 */
const keywordProperties = function* (node) {
  if (node === undefined || !("jsonType" in node)) {
    return;
  }

  if (node.jsonType === "array") {
    for (const item of node.children) {
      yield* keywordProperties(item);
    }
  } else if (node.jsonType === "object") {
    for (const property of node.children) {
      if (property.keywordUri !== undefined) {
        yield /** @type JsonSchemaKeywordNode<JsonErrorNode> */ (property);
      }
      yield* keywordProperties(property.children[1]);
    }
  }
};
