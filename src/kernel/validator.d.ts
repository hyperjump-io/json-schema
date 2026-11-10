import type { Json, JsonErrorNode, JsonNode, ReadonlyJson } from "@hyperjump/browser";
import type { AnnotationResult, EvaluationOptions } from "../operations/validate.d.ts";
import type { Kernel } from "./kernel.d.ts";
import type { instrumented } from "./instrumented.js";
import type { Definitions } from "./definitions.js";

/**
 * A compiled schema's evaluators, which `CompiledSchema` is. It isn't part
 * of the API. Operations evaluate with it (see `validatorFor`).
 *
 * Output formats, plugins, annotating, and ASTs need the instrumented
 * evaluator (`evaluator`), which the validator doesn't import, so code that
 * only validates values without output doesn't load it. The operations
 * that need it import it and pass it.
 */
export class Validator {
  constructor(definitions: Definitions, kernel: Kernel);

  readonly uri: string;

  /**
   * The evaluator for a value with FLAG output and no plugins, built the
   * first time it's asked for
   */
  flagEvaluator(): (instance: Json) => boolean;

  validate<R = boolean>(instance: ReadonlyJson, options?: EvaluationOptions<R>, evaluator?: typeof instrumented): R;
  validateJson<R = boolean>(json: string, options?: EvaluationOptions<R>, evaluator?: typeof instrumented): R;
  validateNode<R = boolean>(node: JsonNode<unknown, JsonErrorNode> | JsonErrorNode, options?: EvaluationOptions<R>, evaluator?: typeof instrumented): R;
  annotate<R = boolean>(instance: ReadonlyJson, options?: EvaluationOptions<R>, evaluator?: typeof instrumented): AnnotationResult<R>;
  annotateJson<R = boolean>(json: string, options?: EvaluationOptions<R>, evaluator?: typeof instrumented): AnnotationResult<R>;
  annotateNode<R = boolean>(node: JsonNode<unknown, JsonErrorNode> | JsonErrorNode, options?: EvaluationOptions<R>, evaluator?: typeof instrumented): R;
  serialize(): Json;
}
