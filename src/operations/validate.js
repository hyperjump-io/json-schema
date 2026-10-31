import { compile } from "./compile.js";
import { annotateFunction, needsInstrumented, validateFunction, validatorOf } from "./evaluators.js";

/**
 * @import { instrumented } from "../kernel/instrumented.js"
 * @import * as API from "./validate.d.ts"
 */

/** @type API.validate */
export const validate = async (context, schema, instance, options) => {
  return /** @type any */ ((await validator(context, schema, /** @type any */ (options)))(/** @type any */ (instance)));
};

/** @type API.validator */
export const validator = async (context, schema, options = {}) => {
  const compiled = await compile(context, schema, options);
  return validateFunction(validatorOf(compiled), options, needsInstrumented(options) ? await loadInstrumented() : undefined);
};

/** @type API.annotate */
export const annotate = async (context, schema, instance, options) => {
  return /** @type any */ ((await annotator(context, schema, /** @type any */ (options)))(/** @type any */ (instance)));
};

/** @type API.annotator */
export const annotator = async (context, schema, options = {}) => {
  const compiled = await compile(context, schema, options);
  return annotateFunction(validatorOf(compiled), options, await loadInstrumented());
};

/**
 * The instrumented evaluator is loaded when it's needed, so code that only
 * validates values without output never loads it
 *
 * @type () => Promise<typeof instrumented>
 */
const loadInstrumented = async () => (await import("../kernel/instrumented.js")).instrumented;
