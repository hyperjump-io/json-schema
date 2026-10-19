/**
 * @import { Optimization } from "../optimize.js"
 */

/**
 * Every optimization, one per file in this directory, in the order they run.
 * Order matters: a pass can leave work for the ones after it, like folding a
 * constant leaving a subschema nothing references.
 *
 * @type Optimization[]
 */
export const optimizations = [];
