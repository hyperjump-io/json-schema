import staticDynamicScope from "./static-dynamic-scope.js";
import staticUnevaluated from "./static-unevaluated.js";
import foldPassing from "./fold-passing.js";
import dispatch from "./dispatch.js";
import dropGroups from "./drop-groups.js";

/**
 * @import { Optimization } from "../optimize.js"
 */

/**
 * Every optimization, one per file in this directory, in the order they run.
 * Order matters: a pass can leave work for the ones after it, like
 * `static-unevaluated` leaving a schema whose marks nothing reads, which
 * folding can then fold, or `static-dynamic-scope` leaving an `apply` where
 * `static-unevaluated` can see what's marked.
 *
 * @type Optimization[]
 */
export const optimizations = [
  staticDynamicScope,
  staticUnevaluated,
  foldPassing,
  dispatch,
  dropGroups
];
