import type { Position } from "unist";
import type { VFileMessage } from "vfile-message";
import type { OutputError } from "./output-format.d.ts";
import type { SchemaMessage } from "../schema/schema-error.d.ts";

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
 * {@link outputErrorMessage}, or a {@link SchemaMessage} with its own
 * message, its document's URI as the `file`, and `fatal` if it's an error.
 * To add one to a `VFile`, use `file.message` with the message and its
 * `place`, `ruleId`, and `source` instead.
 */
export const toVFileMessage: (error: OutputError | SchemaMessage) => VFileMessage;
