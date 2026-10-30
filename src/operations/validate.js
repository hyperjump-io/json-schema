import { compile } from "./compile.js";

/**
 * @import { Validator } from "../kernel/validator.js"
 * @import { CompiledSchema } from "./compile.d.ts"
 * @import * as API from "./validate.d.ts"
 */

/** @type API.validate */
export const validate = async (context, schema, instance, options) => {
  return /** @type any */ ((await validator(context, schema, /** @type any */ (options)))(/** @type any */ (instance)));
};

/** @type API.validator */
export const validator = async (context, schema, options) => {
  return validatorFor(await compile(context, schema, options), /** @type any */ (options));
};

/** @type API.annotate */
export const annotate = async (context, schema, instance, options) => {
  return /** @type any */ ((await annotator(context, schema, /** @type any */ (options)))(/** @type any */ (instance)));
};

/** @type API.annotator */
export const annotator = async (context, schema, options) => {
  return annotatorFor(await compile(context, schema, options), /** @type any */ (options));
};

/** @type API.validatorFor */
export const validatorFor = (compiled, options = {}) => {
  const validator = validatorOf(compiled);
  const evaluation = evaluationOptions(options);

  switch (options.input ?? "value") {
    case "value":
      return (/** @type any */ instance) => validator.validate(instance, evaluation);
    case "json":
      return (/** @type any */ json) => validator.validateJson(json, evaluation);
    case "node":
      return (/** @type any */ node) => validator.validateNode(node, evaluation);
    default:
      throw TypeError(`'${options.input}' isn't an input. It's 'value', 'json', or 'node'.`);
  }
};

/** @type API.annotatorFor */
export const annotatorFor = (compiled, options = {}) => {
  const validator = validatorOf(compiled);
  const evaluation = evaluationOptions(options);

  switch (options.input ?? "value") {
    case "value":
      return (/** @type any */ instance) => validator.annotate(instance, evaluation);
    case "json":
      return (/** @type any */ json) => validator.annotateJson(json, evaluation);
    case "node":
      return (/** @type any */ node) => ({ output: validator.annotateNode(node, evaluation), status: "success", node });
    default:
      throw TypeError(`'${options.input}' isn't an input. It's 'value', 'json', or 'node'.`);
  }
};

/** @type (compiled: CompiledSchema) => Validator */
const validatorOf = (compiled) => /** @type Validator */ (/** @type unknown */ (compiled));

/**
 * Without an output format or plugins, evaluation takes the fastest path,
 * which is only for no options at all.
 *
 * @type (options: API.EvaluationOptions<any, any>) => API.EvaluationOptions<any, any> | undefined
 */
const evaluationOptions = ({ output, plugins }) => output === undefined && plugins === undefined ? undefined : { output, plugins };
