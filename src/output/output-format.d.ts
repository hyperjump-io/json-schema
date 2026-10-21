import type { JsonSyntaxError } from "@hyperjump/browser/json";
import type { EvaluationPlugin } from "../evaluate/evaluation-plugin.d.ts";
import type { JsonSchema } from "../json-schema.d.ts";
import type { Keyword } from "../keyword.d.ts";
import type { DetailedValidationError, toVFileMessage, ValidationError } from "./validation-error.d.ts";

/**
 * How an output format is produced. It's called for each evaluation that
 * uses the format.
 *
 * Evaluation without plugins is fastest, so an instance is evaluated without
 * the format's plugin first unless other plugins are used. The plugin only
 * runs if the instance is invalid. So `output(true)` can be called without
 * the plugin having seen anything.
 */
export type OutputFormatDefinition<F extends OutputFormat> = () => {
  plugin?: EvaluationPlugin;

  /**
   * @param valid - False if there are syntax errors, even if the instance
   * passed the schema
   * @param syntaxErrors - Errors from parsing JSON text. It's empty for an
   * instance that wasn't parsed.
   */
  output: (valid: boolean, syntaxErrors: JsonSyntaxError[]) => ValidationResult<F>;
};

/**
 * The output format determines what's included in `errors`. To add an output
 * format, augment this interface and add its implementation with
 * {@link JsonSchema.addOutputFormat}.
 *
 * ```ts
 * declare module "@hyperjump/json-schema" {
 *   interface OutputFormats {
 *     MY_FORMAT: { valid: boolean; errors: MyError[] };
 *   }
 * }
 * ```
 *
 * The built-in formats' errors are plain data without messages. Messages
 * that explain errors are left to other output formats, such as
 * `@hyperjump/json-schema-errors`. {@link toVFileMessage} gives an error a
 * generic message to report it with unified tooling.
 */
// TODO: Support the output format being developed for the next spec release
export interface OutputFormats {
  /**
   * Only whether the instance is valid. It's a plain boolean rather than an
   * object so the fastest path doesn't allocate anything.
   */
  FLAG: boolean;

  /**
   * A flat list of every error. A keyword whose failure is fully explained
   * by its subschemas' failures ({@link Keyword.simpleApplicator}) doesn't get
   * an error of its own.
   */
  BASIC: { valid: boolean; errors: OutputError[] };

  /**
   * Errors nested by schema structure. Applicators that fail because a
   * subschema failed contain those failures in `errors`.
   */
  DETAILED: { valid: boolean; errors: OutputError<DetailedValidationError>[] };
}

export type OutputFormat = keyof OutputFormats;

export type ValidationResult<F extends OutputFormat> = OutputFormats[F];

/**
 * Errors are in document order. Syntax errors only occur with JSON text.
 */
export type OutputError<V extends ValidationError = ValidationError> = V | JsonSyntaxError;

/**
 * A syntax error from parsing JSON text. These come from the parser in
 * `@hyperjump/browser`.
 */
export type { JsonSyntaxError };
