import { optimizations } from "./optimizations/index.js";

/**
 * @import { JsonSchema } from "../json-schema.d.ts"
 * @import { CompiledSchemas } from "./compile.js"
 */

/**
 * A transformation of the IR. It returns a new IR rather than changing the
 * one it's given, because a `Validator` keeps that one for its other
 * specializations and for `serialize`.
 *
 * A pass that loses error locations is `fastOnly`. It only runs for the fast
 * specializations, the ones without plugins or annotations, which only say
 * whether an instance is valid. Other passes run once, before the IR is
 * serialized.
 *
 * Passes get the `JsonSchema` the IR was compiled with, to look up what
 * keywords read (`Keyword.reads`).
 *
 * @typedef {{
 *   fastOnly: boolean;
 *   optimize: (compiled: CompiledSchemas, jsonSchema: JsonSchema) => CompiledSchemas;
 * }} Optimization
 */

/**
 * Run the optimizations, in order, that are `fastOnly` or not.
 *
 * @type (compiled: CompiledSchemas, jsonSchema: JsonSchema, fastOnly: boolean) => CompiledSchemas
 */
export const optimize = (compiled, jsonSchema, fastOnly) => {
  for (const optimization of optimizations) {
    if (optimization.fastOnly === fastOnly) {
      compiled = optimization.optimize(compiled, jsonSchema);
    }
  }

  return compiled;
};
