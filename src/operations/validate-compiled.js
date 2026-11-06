import { instrumented } from "../kernel/instrumented.js";
import { annotateFunction, validateFunction, validatorOf } from "./evaluators.js";

/**
 * @import * as API from "./validate-compiled.d.ts"
 */

// These are synchronous, so they can't load the instrumented evaluator when
// it's needed. They're in a module of their own, so code that doesn't use
// them doesn't load it.

/** @type typeof API.validatorFor */
export const validatorFor = (compiled, options = {}) => {
  return validateFunction(validatorOf(compiled), options, instrumented);
};

/** @type typeof API.annotatorFor */
export const annotatorFor = (compiled, options = {}) => {
  return annotateFunction(validatorOf(compiled), options, instrumented);
};
