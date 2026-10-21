import { VFileMessage } from "vfile-message";
import { jsonSyntaxErrorMessage } from "@hyperjump/browser/json";

/**
 * @import * as API from "./validation-error.d.ts"
 * @import { OutputError } from "./output-format.d.ts"
 */

/** @type API.outputErrorMessage */
export const outputErrorMessage = (error) => {
  if (error.source === "json") {
    return jsonSyntaxErrorMessage(error);
  }

  // A position says where the instance is better than a pointer
  const constraint = `the constraint at '${error.absoluteKeywordLocation}'`;
  if (error.place !== undefined) {
    return `Fails ${constraint}`;
  }

  const instance = error.instanceLocation === "" ? "The instance" : `'${error.instanceLocation}'`;
  return `${instance} fails ${constraint}`;
};

/** @type API.toVFileMessage */
export const toVFileMessage = (error) => {
  // Creating an Error captures a stack trace, which says nothing about the
  // error and is most of what creating it costs
  const stackTraceLimit = Error.stackTraceLimit;
  Error.stackTraceLimit = 0;
  try {
    const message = new VFileMessage(outputErrorMessage(error), {
      place: error.place,
      ruleId: error.ruleId,
      source: error.source
    });
    if (error.source === "json") {
      message.actual = error.actual;
    }
    return message;
  } finally {
    Error.stackTraceLimit = stackTraceLimit;
  }
};

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
