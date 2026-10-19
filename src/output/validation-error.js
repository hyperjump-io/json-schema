import { VFileMessage } from "vfile-message";

/**
 * @import * as API from "./validation-error.d.ts"
 * @import { OutputError } from "./output-format.d.ts"
 */

/** @implements API.ValidationError */
export class ValidationError extends VFileMessage {
  /** @type {"json-schema"} */
  source = "json-schema";

  /** @type string */
  ruleId;

  /**
   * @param {string} reason
   * @param {API.ValidationErrorOptions} options
   */
  constructor(reason, options) {
    // VFileMessage replaces the stack trace with an empty string, but the
    // Error constructor still captures one, which is most of what collecting
    // errors costs
    const stackTraceLimit = Error.stackTraceLimit;
    Error.stackTraceLimit = 0;
    try {
      super(reason, { place: options.place, ruleId: options.ruleId, source: "json-schema" });
    } finally {
      Error.stackTraceLimit = stackTraceLimit;
    }

    this.ruleId = options.ruleId;

    this.keywordLocation = options.keywordLocation;
    this.absoluteKeywordLocation = options.absoluteKeywordLocation;
    this.instanceLocation = options.instanceLocation;
  }
}

/** @implements API.DetailedValidationError */
export class DetailedValidationError extends ValidationError {
  /** @type API.DetailedValidationError[] | undefined */
  errors;
}

/** @implements API.InvalidSchemaError */
export class InvalidSchemaError extends Error {
  /**
   * @param {OutputError[]} errors
   */
  constructor(errors) {
    super("The schema is invalid");
    this.errors = errors;
  }
}
