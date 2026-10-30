import { compile } from "./compile.js";
import { annotateFunction, needsInstrumented, validateFunction, validatorOf } from "./evaluators.js";

/**
 * @import { CompiledSchema } from "./compile.d.ts"
 * @import * as API from "./validate.d.ts"
 */

/** @type API.validate */
export const validate = async (context, schema, instance, options) => {
  return /** @type any */ ((await validator(context, schema, /** @type any */ (options)))(/** @type any */ (instance)));
};

/** @type API.validator */
export const validator = async (context, schema, options = {}) => {
  const compiled = await compile(context, schema, options);
  if (needsInstrumented(options)) {
    await loadInstrumented(compiled);
  }
  return validateFunction(validatorOf(compiled), options);
};

/** @type API.annotate */
export const annotate = async (context, schema, instance, options) => {
  return /** @type any */ ((await annotator(context, schema, /** @type any */ (options)))(/** @type any */ (instance)));
};

/** @type API.annotator */
export const annotator = async (context, schema, options = {}) => {
  const compiled = await compile(context, schema, options);
  await loadInstrumented(compiled);
  return annotateFunction(validatorOf(compiled), options);
};

/**
 * The instrumented evaluator is loaded when it's needed, so code that only
 * validates values without output never loads it
 *
 * @type (compiled: CompiledSchema) => Promise<void>
 */
const loadInstrumented = async (compiled) => {
  const { instrumented } = await import("../kernel/instrumented.js");
  validatorOf(compiled).useInstrumented(instrumented);
};
