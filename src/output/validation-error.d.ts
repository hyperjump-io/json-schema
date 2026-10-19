import type { Position } from "unist";
import type { VFileMessage } from "vfile-message";
import type { OutputError } from "./output-format.d.ts";

/**
 * An instance location failed a keyword. This is a VFileMessage so it can be
 * used with unified tooling. `place` is set when the instance came from JSON
 * text.
 */
export class ValidationError extends VFileMessage {
  source: "json-schema";

  /** The URI of the keyword that failed */
  ruleId: string;

  /** A JSON Pointer to the keyword relative to the schema evaluation started from, following references. */
  keywordLocation: string;

  /** The URI of the keyword in the schema it's defined in */
  absoluteKeywordLocation: string;

  /** A JSON Pointer to the value in the instance that failed */
  instanceLocation: string;

  constructor(reason: string, options: ValidationErrorOptions);
}

export type ValidationErrorOptions = {
  ruleId: string;
  keywordLocation: string;
  absoluteKeywordLocation: string;
  instanceLocation: string;

  /** Where the instance is in the JSON text it came from */
  place?: Position;
};

export class DetailedValidationError extends ValidationError {
  /** The subschema failures that caused this keyword to fail */
  errors?: DetailedValidationError[];
}

/**
 * Thrown when compiling a schema that isn't valid according to its
 * meta-schema.
 */
export class InvalidSchemaError extends Error {
  /** Errors are positioned in the schema document if it was parsed from text. */
  errors: OutputError[];

  constructor(errors: OutputError[]);
}
