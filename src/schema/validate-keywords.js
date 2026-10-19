import { keywordDefinitionUri } from "../keywords/unknown.js";

/**
 * @import { JsonErrorNode } from "@hyperjump/browser/json"
 * @import { JsonSchema, Validator } from "../json-schema.d.ts"
 * @import { Keyword } from "../keyword.d.ts"
 * @import { OutputError } from "../output/output-format.d.ts"
 * @import { JsonSchemaKeywordNode, JsonSchemaTolerantNode } from "./schema-ast.d.ts"
 * @import * as API from "./validate-keywords.d.ts"
 */

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
      const validator = await keywordSchemaValidator(jsonSchema, jsonSchema.getKeyword(keywordUri));
      const output = validator.validateNode(valueNode, { output: "BASIC" });
      if (!output.valid) {
        file.message(`The value of '${nameNode.value}' isn't valid`, {
          place: valueNode.position,
          ruleId: keywordUri,
          source: "json-schema",
          cause: keywordSchemaErrors(output.errors, `The value of '${nameNode.value}' doesn't match the keyword's schema`)
        });
      }
    }

    return tree;
  };
}

/**
 * Reporters like `vfile-reporter` show a cause's stack, which would only say
 * where the error was created. The keyword schema's errors explain the
 * problem, so the stack lists them instead.
 *
 * @type (errors: OutputError[], message: string) => AggregateError
 */
const keywordSchemaErrors = (errors, message) => {
  const error = new AggregateError(errors, message);
  error.stack = [
    `${error.name}: ${message}`,
    ...errors.map((error) => "absoluteKeywordLocation" in error
      ? `    ${String(error)} (${error.absoluteKeywordLocation})`
      : `    ${String(error)}`)
  ].join("\n");

  return error;
};

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

/**
 * Keyword schemas are compiled once for each keyword definition in each
 * `JsonSchema`. A keyword that's replaced has a new definition, so its schema
 * is compiled again.
 *
 * @type WeakMap<JsonSchema, WeakMap<Keyword, Promise<Validator>>>
 */
const validatorCache = new WeakMap();

/** @type (jsonSchema: JsonSchema, keyword: Keyword) => Promise<Validator> */
const keywordSchemaValidator = (jsonSchema, keyword) => {
  let validators = validatorCache.get(jsonSchema);
  if (validators === undefined) {
    validators = new WeakMap();
    validatorCache.set(jsonSchema, validators);
  }

  let validator = validators.get(keyword);
  if (validator === undefined) {
    validator = jsonSchema.compile(keyword.uri);
    validators.set(keyword, validator);
  }

  return validator;
};
