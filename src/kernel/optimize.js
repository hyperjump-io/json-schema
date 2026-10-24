import { optimizations } from "./optimizations/index.js";

/**
 * @import { Expression, Kernel } from "./kernel.d.ts"
 */

/**
 * What an evaluation can observe, which decides what can be optimized
 * (KERNEL.md, "Optimizer"):
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
 * A rewrite of a kernel for a mode. It returns a new kernel rather than
 * changing the one it's given, because a `Validator` keeps that one for its
 * other modes and for `serialize`. A pass that has nothing to do for a mode
 * returns the kernel it's given.
 *
 * @typedef {{ optimize: (kernel: Kernel, mode: Mode) => Kernel }} Optimization
 */

/**
 * Whether a keyword group has no effect anything in a mode can see:
 * `annotate` when nothing sees annotations, and `pass` without plugins.
 * Plugins see a keyword that has no effect, like `uniqueItems: false`, pass.
 *
 * @type (expression: Expression, mode: Mode) => boolean
 */
export const isInert = (expression, { plugins, annotations }) => {
  return (!plugins && expression.op === "pass") || (!annotations && expression.op === "annotate");
};

/**
 * Run the optimizations, in order, for a mode
 *
 * @type (kernel: Kernel, mode: Mode) => Kernel
 */
export const optimize = (kernel, mode) => {
  for (const optimization of optimizations) {
    kernel = optimization.optimize(kernel, mode);
  }

  return kernel;
};
