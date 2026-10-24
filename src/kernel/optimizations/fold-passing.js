import { readsMarks } from "../kernel.js";
import { normalForm } from "../normalize.js";
import { isInert } from "../optimize.js";

/**
 * @import { CompiledSchema, Expression, Handle } from "../kernel.d.ts"
 * @import { Optimization } from "../optimize.js"
 */

/**
 * A schema that passes every instance and has no effect anything can see,
 * like `true`, `{}`, or one with only annotations when nothing sees them,
 * is `pass` wherever it's applied (see `isInert`). An operation that
 * applies `pass` to children is `pass` too, unless something reads marks,
 * because it marks what it evaluates. `eachPropertyName` doesn't mark
 * anything, so it always is.
 *
 * It's `alwaysPasses` from before the kernel, as an expression rewrite.
 *
 * @type Optimization
 */
export default {
  optimize(kernel, mode) {
    const marksAreRead = Object.values(kernel.schemas).some((schema) => {
      return typeof schema !== "boolean" && schema.keywords.some(({ expression }) => readsMarks(expression));
    });

    /** @type Record<Handle, CompiledSchema> */
    const optimized = {};

    /** @type Set<Handle> */
    const inProgress = new Set();

    /** @type (handle: Handle) => CompiledSchema */
    const schema = (handle) => {
      if (handle in optimized) {
        return optimized[handle];
      }

      const compiled = kernel.schemas[handle];
      if (typeof compiled === "boolean") {
        optimized[handle] = compiled;
        return compiled;
      }

      inProgress.add(handle);
      const keywords = compiled.keywords.map((group) => ({ ...group, expression: normalForm(fold(group.expression)) }));
      inProgress.delete(handle);

      optimized[handle] = { ...compiled, keywords };
      return optimized[handle];
    };

    // A schema that's being optimized, because it applies itself, is
    // assumed not to pass everything
    /** @type (handle: Handle) => boolean */
    const alwaysPasses = (handle) => {
      if (inProgress.has(handle)) {
        return false;
      }

      const compiled = schema(handle);
      return compiled === true || (typeof compiled !== "boolean" && compiled.keywords.every(({ expression }) => isInert(expression, mode)));
    };

    /** @type (expression: Expression) => Expression */
    const fold = (expression) => {
      switch (expression.op) {
        case "apply":
          return alwaysPasses(expression.schema) ? { op: "pass" } : expression;
        case "all":
        case "any":
        case "one":
          return { ...expression, of: expression.of.map(fold) };
        case "not": {
          const of = fold(expression.of);
          return of.op === "pass" ? { op: "fail" } : { ...expression, of };
        }
        case "cases":
          return {
            ...expression,
            cases: expression.cases.map(([condition, then]) => [fold(condition), then && fold(then)]),
            otherwise: expression.otherwise && fold(expression.otherwise)
          };
        case "item":
        case "eachItem":
        case "property":
        case "eachProperty":
        case "eachPropertyName": {
          const of = fold(expression.of);
          return of.op === "pass" && (!marksAreRead || expression.op === "eachPropertyName") ? of : { ...expression, of };
        }
        case "contains":
          return { ...expression, of: fold(expression.of) };
        default:
          return expression;
      }
    };

    for (const handle in kernel.schemas) {
      schema(handle);
    }

    return { ...kernel, schemas: optimized };
  }
};
