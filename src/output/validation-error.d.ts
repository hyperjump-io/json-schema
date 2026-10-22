import type { Position } from "unist";
import type { VFileMessage } from "vfile-message";
import type { OutputError } from "./output-format.d.ts";

/**
 * An instance location failed a keyword. It's plain data, without a message.
 * Use {@link toVFileMessage} to report it with unified tooling, or
 * {@link outputErrorMessage} to describe it.
 */
export type ValidationError = {
  source: "json-schema";

  /** The URI of the keyword that failed */
  ruleId: string;

  /** The URI of the keyword in the schema it's defined in */
  absoluteKeywordLocation: string;

  /** A JSON Pointer to the value in the instance that failed */
  instanceLocation: string;

  /** Where the instance is in the JSON text it came from, if it came from text */
  place?: Position;
};

export type DetailedValidationError = ValidationError & {
  /** The subschema failures that caused this keyword to fail */
  errors?: DetailedValidationError[];
};

/**
 * A description of an output error for people. A validation error says which
 * keyword failed, by its absolute keyword location. It also says where in the
 * instance, unless the error has a position to report that.
 *
 * ```
 * '/age' fails the constraint at 'https://example.com/person#/properties/age/minimum'
 * ```
 */
export const outputErrorMessage: (error: OutputError) => string;

/**
 * An output error as a `VFileMessage`, described by
 * {@link outputErrorMessage}. To add it to a `VFile`, use `file.message` with
 * the message and the error's `place`, `ruleId`, and `source` instead.
 */
export const toVFileMessage: (error: OutputError) => VFileMessage;

/**
 * Not thrown yet. An invalid schema can't be retrieved, so compiling one
 * throws a `RetrievalError` from `@hyperjump/browser` whose `cause` is the
 * problem.
 */
export class InvalidSchemaError extends Error {
  /** Errors are positioned in the schema document if it was parsed from text. */
  errors: OutputError[];

  constructor(errors: OutputError[]);
}
