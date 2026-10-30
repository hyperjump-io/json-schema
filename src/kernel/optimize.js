import { optimizations } from "./optimizations/index.js";
import { schemaReads } from "./kernel.js";

/**
 * @import { KernelSchema, EvaluationState, Expression, Handle, Kernel } from "./kernel.d.ts"
 */

/**
 * What an evaluation can observe, which decides what can be optimized
 * (`design/specs/kernel/optimizer.md`):
 *
 * - `fast`: There are no plugins and nothing is annotated, so only the
 *   result and marks matter. Error locations can be lost.
 * - `plugins`: There are plugins. They see every keyword group that's
 *   evaluated, even one that has no effect.
 * - `annotations`: Something sees annotations: annotating, or a plugin with
 *   an `annotation` hook. Otherwise, `annotate` has no effect.
 *
 * With plugins, what plugins see can depend on the optimizations, but it
 * can't be wrong: each hook call is still about what it says.
 *
 * @typedef {{ fast: boolean; plugins: boolean; annotations: boolean }} Mode
 */

/**
 * A rewrite of a kernel for a mode. It returns the schemas it replaces, by
 * handle, and doesn't change the kernel it's given. `optimize` puts them in
 * one copy of the kernel's schemas for every pass, because copying a large
 * kernel's schemas costs about as much as a pass's own work (1 ms for the
 * 4,304 of SchemaStore's `package.json` schema). A pass that has nothing to
 * do for a mode returns an empty map. `null` removes a schema, which nothing
 * left in the kernel can apply.
 *
 * @typedef {{ optimize: (kernel: Kernel, mode: Mode) => Map<Handle, KernelSchema | null> }} Optimization
 */

/**
 * Run the optimizations, in order, for a mode
 *
 * @type (kernel: Kernel, mode: Mode) => Kernel
 */
export const optimize = (kernel, mode) => {
  // The kernel the `Validator` keeps is copied once, the first time a pass
  // changes something, and later passes get the copy. What the replaced
  // schemas read is worked out here, so passes don't have to.
  let optimized = kernel;
  /** @type Kernel["schemas"] | undefined */
  let schemas;
  /** @type Record<EvaluationState, Set<Handle>> | undefined */
  let reads;
  for (const optimization of optimizations) {
    const replaced = optimization.optimize(optimized, mode);
    if (replaced.size === 0) {
      continue;
    }

    schemas ??= { ...kernel.schemas };
    reads ??= { evaluated: new Set(kernel.reads.evaluated), dynamicScope: new Set(kernel.reads.dynamicScope) };
    for (const [handle, schema] of replaced) {
      if (schema === null) {
        delete schemas[handle];
        reads.evaluated.delete(handle);
        reads.dynamicScope.delete(handle);
        continue;
      }

      schemas[handle] = schema;
      const schemaRead = schemaReads(schema);
      for (const state of /** @type EvaluationState[] */ (["evaluated", "dynamicScope"])) {
        if (schemaRead.includes(state)) {
          reads[state].add(handle);
        } else {
          reads[state].delete(handle);
        }
      }
    }
    optimized = { ...kernel, schemas, reads: { evaluated: [...reads.evaluated], dynamicScope: [...reads.dynamicScope] } };
  }

  return optimized;
};
