import { normalForm } from "../normalize.js";
import { isInert } from "../optimize.js";

/**
 * @import { CompiledSchema, Expression, Handle, KeywordGroup, TypeName } from "../kernel.d.ts"
 * @import { Optimization } from "../optimize.js"
 */

/**
 * Pick what `any` and `one` evaluate by the instance's type, where their
 * expressions can only pass some types:
 *
 * - An `any` of expressions that only check the type, like `anyOf` of
 *   `{ "type": "boolean" }` and `{ "type": "null" }`, is a `typeIs` with
 *   all their types.
 * - A `one` whose expressions can't pass the same type, like `oneOf` with a
 *   different `type` in each schema, is a `cases` with a `typeIs` condition
 *   for each, otherwise `fail`. It only evaluates the one that can pass,
 *   instead of every one to find out none of the others passes. The
 *   evaluators look a `cases` like that up by type.
 *
 * What isn't evaluated would fail, so the result and the marks are the
 * same. It's not for plugins, which see every error, or the schemas that
 * applied would get no hook calls. An `any` like that isn't a `cases`: it
 * already stops at the first that passes, and dispatching was slower.
 *
 * @type Optimization
 */
export default {
  optimize(kernel, mode) {
    /** @type Map<Handle, CompiledSchema> */
    const replaced = new Map();
    if (mode.plugins) {
      return replaced;
    }

    /** @type Map<Handle, Set<TypeName> | null> */
    const schemaTypes = new Map();

    /**
     * The instance types (never `integer`) an expression can pass, or
     * `null` if that isn't known. A schema that's still being worked out,
     * because it applies itself, isn't known. Leaving out what isn't known
     * only adds types, so a type is only missing if it can't pass.
     *
     * @type (expression: Expression) => Set<TypeName> | null
     */
    const possibleTypes = (expression) => {
      switch (expression.op) {
        case "fail":
          return new Set();
        case "typeIs":
          return new Set(expression.types.map((type) => type === "integer" ? "number" : type));
        case "equals":
          return new Set([typeOf(expression.value)]);
        case "oneOfValues":
          return new Set(expression.values.map(typeOf));
        case "all":
          return intersection(expression.of);
        case "any":
        case "one": {
          const types = expression.of.map(possibleTypes);
          return types.some((type) => type === null) ? null : new Set(types.flatMap((type) => [...type ?? []]));
        }
        case "apply": {
          if (schemaTypes.has(expression.schema)) {
            return /** @type Set<TypeName> | null */ (schemaTypes.get(expression.schema));
          }
          const compiled = kernel.schemas[expression.schema];
          if (typeof compiled === "boolean") {
            return compiled ? null : new Set();
          }
          schemaTypes.set(expression.schema, null);
          const types = intersection(compiled.keywords.map(({ expression }) => expression));
          schemaTypes.set(expression.schema, types);
          return types;
        }
        default:
          return null;
      }
    };

    /**
     * The types all of the expressions can pass. Most can pass any type, and
     * they're skipped without a call.
     *
     * @type (expressions: Expression[]) => Set<TypeName> | null
     */
    const intersection = (expressions) => {
      /** @type Set<TypeName> | null */
      let result = null;
      for (const expression of expressions) {
        if (!constrainsTypes.has(expression.op)) {
          continue;
        }
        const types = possibleTypes(expression);
        if (types !== null) {
          result = result === null ? types : types.intersection(result);
        }
      }
      return result;
    };

    /**
     * The types, if an expression only checks the instance's type, maybe
     * through a schema whose only group with an effect is a `typeIs`
     *
     * @type (expression: Expression) => TypeName[] | undefined
     */
    const typesChecked = (expression) => {
      if (expression.op === "typeIs") {
        return expression.types;
      } else if (expression.op === "apply") {
        const compiled = kernel.schemas[expression.schema];
        const groups = typeof compiled === "boolean" ? [] : compiled.keywords.filter(({ expression }) => !isInert(expression, mode));
        return groups.length === 1 && groups[0].expression.op === "typeIs" ? groups[0].expression.types : undefined;
      }
      return undefined;
    };

    /** @type (expression: Extract<Expression, { op: "all" | "any" | "one" }>) => Expression | undefined */
    const byType = (expression) => {
      if (expression.op === "any") {
        const types = expression.of.map(typesChecked);
        return types.every((type) => type !== undefined) ? { op: "typeIs", types: [...new Set(types.flat())] } : undefined;
      } else if (expression.op !== "one") {
        return undefined;
      }

      /** @type [Set<TypeName>, Expression][] */
      const candidates = [];
      /** @type Set<TypeName> */
      const seen = new Set();
      for (const subexpression of expression.of) {
        const types = possibleTypes(subexpression);
        if (types === null || !types.isDisjointFrom(seen)) {
          return undefined;
        } else if (types.size > 0) {
          candidates.push([types, subexpression]);
          types.forEach((type) => seen.add(type));
        }
      }

      if (candidates.length < 2) {
        return candidates.length === 0 ? { op: "fail" } : candidates[0][1];
      }
      return {
        op: "cases",
        cases: candidates.map(([types, subexpression]) => [{ op: "typeIs", types: [...types] }, subexpression]),
        otherwise: { op: "fail" }
      };
    };

    /**
     * The expressions rewritten, or the same array if none of them changed,
     * which is almost always
     *
     * @type (expressions: Expression[]) => Expression[]
     */
    const rewriteAll = (expressions) => {
      /** @type Expression[] | undefined */
      let rewritten;
      for (let index = 0; index < expressions.length; index++) {
        const expression = rewrite(expressions[index]);
        if (expression !== expressions[index]) {
          rewritten ??= expressions.slice();
          rewritten[index] = expression;
        }
      }
      return rewritten ?? expressions;
    };

    /** @type (expression: Expression | null) => Expression | null */
    const rewriteNullable = (expression) => expression && rewrite(expression);

    /** @type (expression: Expression) => Expression */
    const rewrite = (expression) => {
      switch (expression.op) {
        case "all":
        case "any":
        case "one": {
          const of = rewriteAll(expression.of);
          const rewritten = of === expression.of ? expression : { ...expression, of };
          return byType(rewritten) ?? rewritten;
        }
        case "not":
        case "item":
        case "eachItem":
        case "property":
        case "eachProperty":
        case "eachPropertyName":
        case "contains": {
          const of = rewrite(expression.of);
          return of === expression.of ? expression : { ...expression, of };
        }
        case "cases": {
          /** @type [Expression, Expression | null][] */
          const cases = expression.cases.map(([condition, then]) => [rewrite(condition), rewriteNullable(then)]);
          const otherwise = rewriteNullable(expression.otherwise);
          const same = otherwise === expression.otherwise && cases.every(([condition, then], index) => {
            return condition === expression.cases[index][0] && then === expression.cases[index][1];
          });
          return same ? expression : { ...expression, cases, otherwise };
        }
        default:
          return expression;
      }
    };

    for (const handle in kernel.schemas) {
      const schema = kernel.schemas[handle];
      if (typeof schema === "boolean") {
        continue;
      }

      /** @type KeywordGroup[] | undefined */
      let keywords;
      for (let index = 0; index < schema.keywords.length; index++) {
        const group = schema.keywords[index];
        const expression = rewrite(group.expression);
        if (expression !== group.expression) {
          keywords ??= schema.keywords.slice();
          keywords[index] = { ...group, expression: normalForm(expression) };
        }
      }
      if (keywords !== undefined) {
        replaced.set(handle, { ...schema, keywords });
      }
    }

    return replaced;
  }
};

/** @type (value: unknown) => TypeName */
const typeOf = (value) => {
  if (value === null) {
    return "null";
  } else if (Array.isArray(value)) {
    return "array";
  }
  return /** @type TypeName */ (typeof value);
};

/** The operations `possibleTypes` knows something about */
const constrainsTypes = new Set(["fail", "typeIs", "equals", "oneOfValues", "all", "any", "one", "apply"]);
