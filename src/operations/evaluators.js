import { FLAG } from "../output/flag.js";

/**
 * @import { Validator } from "../kernel/validator.js"
 * @import { instrumented } from "../kernel/instrumented.js"
 * @import { CompiledSchema } from "./compile.d.ts"
 * @import { JsonDocumentNode, JsonErrorNode, JsonNode } from "@hyperjump/browser"
 * @import { AnnotationResult, EvaluationOptions, InstanceOf } from "./validate.d.ts"
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

/**
 * `evaluator` is the instrumented evaluator, for evaluations that need it
 * (`needsInstrumented`)
 *
 * @type (validator: Validator, options: EvaluationOptions<any, any>, evaluator?: typeof instrumented) => (instance: any) => any
 */
export const validateFunction = (validator, options, evaluator) => {
  const evaluation = evaluationOptions(options);

  // A function's evaluators are built when it's made, instead of on its
  // first call (or its first invalid instance, for an output format's)
  switch (options.input ?? "value") {
    case "value": {
      // Without output or plugins, the function calls the flag evaluator
      // directly
      if (evaluation === undefined) {
        const flag = validator.flagEvaluator();
        return (instance) => flag(instance);
      }
      validator.prepare(false, false, evaluation, evaluator);
      return (instance) => validator.validate(instance, evaluation, evaluator);
    }
    case "json":
      validator.prepare(true, false, evaluation, evaluator);
      return (json) => validator.validateJson(json, evaluation, evaluator);
    case "node":
      validator.prepare(true, false, evaluation, evaluator);
      return (node) => validator.validateNode(instanceNode(node), evaluation, evaluator);
    default:
      throw TypeError(`'${options.input}' isn't an input. It's 'value', 'json', or 'node'.`);
  }
};

/** @type (validator: Validator, options: EvaluationOptions<any, any>, evaluator: typeof instrumented) => (instance: any) => AnnotationResult<any> */
export const annotateFunction = (validator, options, evaluator) => {
  const evaluation = evaluationOptions(options);

  // Every input is annotated as an AST
  switch (options.input ?? "value") {
    case "value":
      validator.prepare(true, true, evaluation, evaluator);
      return (instance) => validator.annotate(instance, evaluation, evaluator);
    case "json":
      validator.prepare(true, true, evaluation, evaluator);
      return (json) => validator.annotateJson(json, evaluation, evaluator);
    case "node":
      validator.prepare(true, true, evaluation, evaluator);
      return (instance) => {
        const node = instanceNode(instance);
        const output = validator.annotateNode(node, evaluation, evaluator);
        // Annotating attached the annotations to it
        return { output, status: "success", node: /** @type AnnotationResult<any>["node"] */ (node) };
      };
    default:
      throw TypeError(`'${options.input}' isn't an input. It's 'value', 'json', or 'node'.`);
  }
};

/**
 * The node a `node` input evaluates: the node, or a document's root
 *
 * @type (instance: InstanceOf<"node">) => JsonNode<unknown, JsonErrorNode> | JsonErrorNode
 */
const instanceNode = (instance) => {
  // A node's type can be any string, so checking it doesn't narrow
  return instance.type === "json-document"
    ? /** @type JsonDocumentNode */ (instance).children[0]
    : /** @type JsonNode<unknown, JsonErrorNode> | JsonErrorNode */ (instance);
};

/**
 * Without an output format or plugins, evaluation takes the fastest path,
 * which is only for no options at all.
 *
 * @type (options: EvaluationOptions<any, any>) => EvaluationOptions<any, any> | undefined
 */
const evaluationOptions = ({ output, plugins }) => output === undefined && plugins === undefined ? undefined : { output, plugins };
