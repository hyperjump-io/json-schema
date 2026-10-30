import type { Plugin } from "unified";
import type { JsonDocumentNode } from "@hyperjump/browser/json";
import type { CompiledSchema } from "../operations/compile.d.ts";

export type JsonSchemaValidateOptions = {
  /** The compiled schema to validate the document against */
  compiled: CompiledSchema;
};

/**
 * Validates a JSON document against a schema. This runs after `rejsonParse`.
 *
 * Validation errors are added to the file as errors (`fatal: true`), with
 * their positions in the document and generic messages (see
 * `outputErrorMessage`). The rule ID is the URI of the keyword that failed,
 * and the source is `json-schema`. The tree isn't changed.
 *
 * Syntax errors are the parser's to report. A document the parser recovered
 * from is validated as far as it could be parsed, and values that couldn't be
 * parsed aren't evaluated, so they don't add errors of their own.
 */
export const jsonSchemaValidate: Plugin<[JsonSchemaValidateOptions], JsonDocumentNode, JsonDocumentNode>;
