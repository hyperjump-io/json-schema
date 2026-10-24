import staticUnevaluated from "./static-unevaluated.js";
import foldPassing from "./fold-passing.js";
import dropGroups from "./drop-groups.js";

/**
 * @import { Optimization } from "../optimize.js"
 */

/**
 * Every optimization, one per file in this directory, in the order they run.
 * Order matters: a pass can leave work for the ones after it, like
 * `static-unevaluated` leaving a schema whose marks nothing reads, which
 * folding can then fold.
 *
 * @type Optimization[]
 */
export const optimizations = [
  staticUnevaluated,
  foldPassing,
  dropGroups
];
