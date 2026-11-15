import { compile } from "./compile.js";
import { annotateFunction, needsInstrumented, validateFunction, validatorOf } from "./evaluators.js";

/**
 * @import { instrumented } from "../kernel/instrumented.js"
 * @import * as API from "./validate.d.ts"
 */

/** @type typeof API.validate */
export const validate = async (jsonSchema, schema, instance, options) => {
  return /** @type any */ ((await validator(jsonSchema, schema, /** @type any */ (options)))(/** @type any */ (instance)));
};

/** @type typeof API.validator */
export const validator = async (jsonSchema, schema, options = {}) => {
  const compiled = await compile(jsonSchema, schema, options);
  return validateFunction(validatorOf(compiled), options, needsInstrumented(options) ? await loadInstrumented() : undefined);
};

/** @type typeof API.annotate */
export const annotate = async (jsonSchema, schema, instance, options) => {
  return /** @type any */ ((await annotator(jsonSchema, schema, /** @type any */ (options)))(/** @type any */ (instance)));
};

/** @type typeof API.annotator */
export const annotator = async (jsonSchema, schema, options = {}) => {
  const compiled = await compile(jsonSchema, schema, options);
  return annotateFunction(validatorOf(compiled), options, await loadInstrumented());
};

/**
 * The instrumented evaluator is loaded when it's needed, so code that only
 * validates values without output never loads it
 *
 * @type () => Promise<typeof instrumented>
 */
const loadInstrumented = async () => (await import("../kernel/instrumented.js")).instrumented;
