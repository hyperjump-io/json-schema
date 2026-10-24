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
 * What doesn't change is kept, down to the kernel itself, because
 * rebuilding every schema of a large kernel cost as much as building its
 * evaluator.
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
    let changed = false;

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
      const keywords = compiled.keywords.map((group) => {
        const expression = fold(group.expression);
        return expression === group.expression ? group : { ...group, expression: normalForm(expression) };
      });
      inProgress.delete(handle);

      if (keywords.every((group, index) => group === compiled.keywords[index])) {
        optimized[handle] = compiled;
        return compiled;
      }

      optimized[handle] = { ...compiled, keywords };
      changed = true;
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

    /** @type (expression: Expression | null) => Expression | null */
    const foldNullable = (expression) => expression && fold(expression);

    /** @type (expression: Expression) => Expression */
    const fold = (expression) => {
      switch (expression.op) {
        case "apply":
          return alwaysPasses(expression.schema) ? { op: "pass" } : expression;
        case "all":
        case "any":
        case "one": {
          const of = expression.of.map(fold);
          return of.every((subexpression, index) => subexpression === expression.of[index]) ? expression : { ...expression, of };
        }
        case "not": {
          const of = fold(expression.of);
          return of.op === "pass" ? { op: "fail" } : of === expression.of ? expression : { ...expression, of };
        }
        case "cases": {
          /** @type [Expression, Expression | null][] */
          const cases = expression.cases.map(([condition, then]) => [fold(condition), foldNullable(then)]);
          const otherwise = foldNullable(expression.otherwise);
          const same = otherwise === expression.otherwise && cases.every(([condition, then], index) => {
            return condition === expression.cases[index][0] && then === expression.cases[index][1];
          });
          return same ? expression : { ...expression, cases, otherwise };
        }
        case "item":
        case "eachItem":
        case "property":
        case "eachProperty":
        case "eachPropertyName": {
          const of = fold(expression.of);
          if (of.op === "pass" && (!marksAreRead || expression.op === "eachPropertyName")) {
            return of;
          }
          return of === expression.of ? expression : { ...expression, of };
        }
        case "contains": {
          const of = fold(expression.of);
          return of === expression.of ? expression : { ...expression, of };
        }
        default:
          return expression;
      }
    };

    for (const handle in kernel.schemas) {
      schema(handle);
    }

    return changed ? { ...kernel, schemas: optimized } : kernel;
  }
};
