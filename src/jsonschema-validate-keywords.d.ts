import type { Plugin } from "unified";
import type { JsonSchema } from "./json-schema.d.ts";
import type { JsonSchemaDocumentNode } from "./schema-ast.d.ts";

export type JsonSchemaValidateKeywordsOptions = {
  /** Provides the keywords and compiles their value schemas */
  jsonSchema: JsonSchema;
};

/**
 * Validates the value of each keyword in a schema AST with the keyword's
 * value schema. This runs after `jsonSchemaResolve`.
 *
 * Each keyword whose value isn't valid gets one message on the file, placed
 * on the value. Its `ruleId` is the keyword's URI, and its `cause` is an
 * `AggregateError` with the value schema's BASIC errors.
 */
export const jsonSchemaValidateKeywords: Plugin<[JsonSchemaValidateKeywordsOptions], JsonSchemaDocumentNode, JsonSchemaDocumentNode>;
