import type { Json, JsonErrorNode, JsonNode, ReadonlyJson } from "@hyperjump/browser/json";
import type { JsonSchema } from "../json-schema.d.ts";
import type { AnnotationResult, EvaluationOptions } from "../operations/validate.d.ts";
import type { Kernel } from "./kernel.d.ts";

/**
 * A compiled schema's evaluators, which `CompiledSchema` is. It isn't part
 * of the API. Operations evaluate with it (see `validatorFor`).
 */
export class Validator {
  constructor(jsonSchema: JsonSchema, kernel: Kernel);

  readonly uri: string;

  validate<R = boolean>(instance: ReadonlyJson, options?: EvaluationOptions<R>): R;
  validateJson<R = boolean>(json: string, options?: EvaluationOptions<R>): R;
  validateNode<R = boolean>(node: JsonNode<unknown, JsonErrorNode> | JsonErrorNode, options?: EvaluationOptions<R>): R;
  annotate<R = boolean>(instance: ReadonlyJson, options?: EvaluationOptions<R>): AnnotationResult<R>;
  annotateJson<R = boolean>(json: string, options?: EvaluationOptions<R>): AnnotationResult<R>;
  annotateNode<R = boolean>(node: JsonNode<unknown, JsonErrorNode> | JsonErrorNode, options?: EvaluationOptions<R>): R;
  serialize(): Json;
}
