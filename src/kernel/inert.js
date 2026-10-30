/**
 * @import { Expression } from "./kernel.d.ts"
 * @import { Mode } from "./optimize.js"
 */

// Not in optimize.js, which imports every pass, so a pass can import it
// without a cycle

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
