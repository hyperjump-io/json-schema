import type { JsonSyntaxError, relativeFileUrl } from "@hyperjump/browser";
import type { EvaluationPlugin } from "../kernel/evaluation-plugin.d.ts";
import type { KeywordInfo } from "../kernel/evaluation-plugin.d.ts";
import type { DetailedValidationError, toVFileMessage, ValidationError } from "./validation-error.d.ts";

/**
 * An output format, passed to an evaluation as `output`. `R` is its result.
 * It's called for each evaluation that uses it. Say a location with
 * {@link relativeFileUrl}, so a `file:` URI doesn't reveal where the schemas
 * are on the machine.
 *
 * Evaluation without plugins is fastest, so an instance is evaluated without
 * the format's plugin first unless other plugins are used. The plugin only
 * runs if the instance is invalid. So `output(true)` can be called without
 * the plugin having seen anything.
 *
 * The built-in formats are `FLAG`, `BASIC`, and `DETAILED`. Their errors are plain data without
 * messages. Messages that explain errors are left to other output formats,
 * such as `@hyperjump/json-schema-errors`. {@link toVFileMessage} gives an
 * error a generic message to report it with unified tooling.
 */
// TODO: Support the output format being developed for the next spec release
export type OutputFormat<R = unknown> = () => {
  plugin?: EvaluationPlugin;

  /**
   * @param valid - False if there are syntax errors, even if the instance
   * passed the schema
   * @param syntaxErrors - Errors from parsing JSON text. It's empty for an
   * instance that wasn't parsed.
   */
  output: (valid: boolean, syntaxErrors: JsonSyntaxError[]) => R;
};

/**
 * The result of `BASIC`: a flat list of every error. A keyword whose failure
 * is fully explained by its subschemas' failures
 * ({@link KeywordInfo.explainsFailure}) doesn't get an error of its own.
 */
export type BasicOutput = { valid: boolean; errors: OutputError[] };

/**
 * The result of `DETAILED`: errors nested by schema structure. Applicators
 * that fail because a subschema failed contain those failures in `errors`.
 */
export type DetailedOutput = { valid: boolean; errors: OutputError<DetailedValidationError>[] };

/**
 * Errors are in document order. Syntax errors only occur with JSON text.
 */
export type OutputError<V extends ValidationError = ValidationError> = V | JsonSyntaxError;

/**
 * A syntax error from parsing JSON text. These come from the parser in
 * `@hyperjump/browser`.
 */
export type { JsonSyntaxError };
