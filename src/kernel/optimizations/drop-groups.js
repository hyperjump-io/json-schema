import { isInert } from "../optimize.js";

/**
 * @import { Kernel } from "../kernel.d.ts"
 * @import { Optimization } from "../optimize.js"
 */

/**
 * Leave out keyword groups that have no effect anything can see (see
 * `isInert`), so they have no hook calls. Without an `annotation` hook
 * (BASIC, DETAILED), annotation-only groups do nothing a plugin can see,
 * and leaving them out was worth more than merging property loops.
 *
 * @type Optimization
 */
export default {
  optimize(kernel, mode) {
    /** @type Kernel["schemas"] | undefined */
    let schemas;
    for (const handle in kernel.schemas) {
      const schema = kernel.schemas[handle];
      if (typeof schema === "boolean" || !schema.keywords.some(({ expression }) => isInert(expression, mode))) {
        continue;
      }

      schemas ??= { ...kernel.schemas };
      schemas[handle] = { ...schema, keywords: schema.keywords.filter(({ expression }) => !isInert(expression, mode)) };
    }

    return schemas === undefined ? kernel : { ...kernel, schemas };
  }
};
