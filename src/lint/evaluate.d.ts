import type { JsonSchemaDocumentNode, JsonSchemaNode, JsonSchemaTolerantNode } from "../schema/schema-ast.d.ts";
import type { JsonSchemaSession } from "../session.d.ts";
import type { LoweredKeyword } from "./lower.d.ts";

/**
 * What evaluating a schema or a keyword on a value found.
 *
 * - `valid`: Whether the value passes, or undefined if that isn't known.
 * - `annotates`: It might annotate the value.
 * - `marks`: It might mark a property or an item of the value as evaluated.
 */
export type LintEvaluation = {
  valid: boolean | undefined;
  annotates: boolean;
  marks: boolean;
};

/**
 * Evaluates the schemas of a document on values in the document, like a
 * `default`, without compiling.
 *
 * - `schema`: Evaluate a schema on a value.
 * - `keywords`: Evaluate each keyword group of an object schema on a value,
 *   in the order they're in the schema. A group that reads marks, like
 *   `unevaluatedProperties`, gets what the groups evaluated before it
 *   marked. It's empty for a schema that wasn't lowered.
 */
export type LintEvaluator = {
  schema: (schemaNode: JsonSchemaNode, instance: JsonSchemaTolerantNode) => LintEvaluation;
  keywords: (schemaNode: JsonSchemaNode, instance: JsonSchemaTolerantNode) => [LoweredKeyword, LintEvaluation][];
};

/**
 * Evaluate what a document's schemas lower to (`lowerForLint`) with pass,
 * fail, or unknown. A schema in another document is lowered too, if the
 * session can find it. What isn't known is unknown: a reference that can't
 * be followed, a `dynamicApply`, because the dynamic scope depends on what
 * applies the schema, an `opaque` operation, and a schema whose dialect
 * isn't known. A keyword that wasn't lowered, like one whose value doesn't
 * fit its shape, isn't evaluated, so it passes. A value that couldn't be
 * parsed passes every schema, as it does when validating.
 *
 * Pass the session the schema was resolved in
 * (`file.data.jsonSchemaSession`). The evaluator is built once for each
 * document and session, so rules share it.
 */
export const evaluatorForLint: (session: JsonSchemaSession, tree: JsonSchemaDocumentNode) => Promise<LintEvaluator>;
