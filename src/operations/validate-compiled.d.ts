import type { CompiledSchema } from "./compile.d.ts";
import type { AnnotationResult, EvaluationOptions, Input, InstanceOf } from "./validate.d.ts";

/** A function that validates instances against a compiled schema */
export function validatorFor<R = boolean, I extends Input = "value">(compiled: CompiledSchema, options?: EvaluationOptions<R, I>): (instance: InstanceOf<I>) => R;

/** A function that annotates instances with a compiled schema */
export function annotatorFor<R = boolean, I extends Input = "value">(compiled: CompiledSchema, options?: EvaluationOptions<R, I>): (instance: InstanceOf<I>) => AnnotationResult<R>;
