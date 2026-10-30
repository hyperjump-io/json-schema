import { FLAG } from "../output/flag.js";

/**
 * @import { Validator } from "../kernel/validator.js"
 * @import { CompiledSchema } from "./compile.d.ts"
 * @import { AnnotationResult, EvaluationOptions } from "./validate.d.ts"
 */

// The functions validators and annotators are, for the operations that make
// them. They aren't part of the API.

/** @type (compiled: CompiledSchema) => Validator */
export const validatorOf = (compiled) => /** @type Validator */ (/** @type unknown */ (compiled));

/**
 * Whether evaluating with these options needs the instrumented evaluator.
 * Only a value with FLAG output and no plugins doesn't.
 *
 * @type (options: EvaluationOptions<any, any>) => boolean
 */
export const needsInstrumented = ({ input, output, plugins }) => {
  return (input ?? "value") !== "value" || (output !== undefined && output !== FLAG) || (plugins?.length ?? 0) > 0;
};

/** @type (validator: Validator, options: EvaluationOptions<any, any>) => (instance: any) => any */
export const validateFunction = (validator, options) => {
  const evaluation = evaluationOptions(options);

  switch (options.input ?? "value") {
    case "value":
      return (instance) => validator.validate(instance, evaluation);
    case "json":
      return (json) => validator.validateJson(json, evaluation);
    case "node":
      return (node) => validator.validateNode(node, evaluation);
    default:
      throw TypeError(`'${options.input}' isn't an input. It's 'value', 'json', or 'node'.`);
  }
};

/** @type (validator: Validator, options: EvaluationOptions<any, any>) => (instance: any) => AnnotationResult<any> */
export const annotateFunction = (validator, options) => {
  const evaluation = evaluationOptions(options);

  switch (options.input ?? "value") {
    case "value":
      return (instance) => validator.annotate(instance, evaluation);
    case "json":
      return (json) => validator.annotateJson(json, evaluation);
    case "node":
      return (node) => ({ output: validator.annotateNode(node, evaluation), status: "success", node });
    default:
      throw TypeError(`'${options.input}' isn't an input. It's 'value', 'json', or 'node'.`);
  }
};

/**
 * Without an output format or plugins, evaluation takes the fastest path,
 * which is only for no options at all.
 *
 * @type (options: EvaluationOptions<any, any>) => EvaluationOptions<any, any> | undefined
 */
const evaluationOptions = ({ output, plugins }) => output === undefined && plugins === undefined ? undefined : { output, plugins };
