import { subexpressions } from "../kernel.js";
import { normalForm } from "../normalize.js";

/**
 * @import { CompiledSchema, Expression, Handle, TypeName } from "../kernel.d.ts"
 * @import { Optimization } from "../optimize.js"
 */

/**
 * A schema's keyword groups are a conjunction. This inlines the schemas they
 * `apply` on the same instance into it, transitively, and combines the
 * operations of the same kind: `typeIs`s into the intersection of their
 * types, counts and `range`s into their tightest limits, and identical
 * operations into one, and leaves out `annotate`. The schema is then one
 * group of what's left.
 *
 * Only without plugins and annotations (`fast`), where only the result and
 * marks matter. A schema that reads marks or the dynamic scope isn't
 * inlined, and a schema that reads marks isn't rewritten, because what it
 * reads is ordered against its own groups. With the dynamic scope read
 * anywhere, a schema is only inlined in its own resource, because entering
 * a resource changes the scope.
 *
 * @type Optimization
 */
export default {
  optimize(kernel, mode) {
    /** @type Map<Handle, CompiledSchema> */
    const replaced = new Map();
    if (!mode.fast) {
      return replaced;
    }

    const readsMarks = new Set(kernel.reads.evaluated);
    const readsScope = new Set(kernel.reads.dynamicScope);
    const tracksDynamicScope = readsScope.size > 0;

    /** @type (handle: Handle, resource: string) => boolean */
    const isInlinable = (handle, resource) => {
      if (readsMarks.has(handle) || readsScope.has(handle)) {
        return false;
      }
      const schema = kernel.schemas[handle];
      return typeof schema === "boolean" || !tracksDynamicScope || schema.resource === resource;
    };

    /**
     * Each object schema's operations, combined, with what it inlines. A
     * schema is inlined from this, so what it inlines is only worked out
     * once. A schema that applies itself keeps the `apply` of the schema
     * it's in when it gets there, which is still what it means.
     *
     * @type Map<Handle, { conjunction: Expression[]; changed: boolean }>
     */
    const conjunctions = new Map();
    /** @type Set<Handle> */
    const inProgress = new Set();

    /** @type (handle: Handle, schema: Exclude<CompiledSchema, boolean>) => { conjunction: Expression[]; changed: boolean } */
    const conjunctionOf = (handle, schema) => {
      let result = conjunctions.get(handle);
      if (result !== undefined) {
        return result;
      }

      inProgress.add(handle);
      /** @type Expression[] */
      const conjunction = [];
      let changed = false;
      /** @type (expression: Expression) => void */
      const flatten = (expression) => {
        if (expression.op === "all") {
          expression.of.forEach(flatten);
        } else if (expression.op === "apply" && !inProgress.has(expression.schema) && isInlinable(expression.schema, schema.resource)) {
          changed = true;
          const applied = kernel.schemas[expression.schema];
          if (applied === false) {
            conjunction.push({ op: "fail" });
          } else if (applied !== true) {
            conjunction.push(...conjunctionOf(expression.schema, applied).conjunction);
          }
        } else {
          conjunction.push(expression);
        }
      };
      for (const { expression } of schema.keywords) {
        flatten(expression);
      }
      inProgress.delete(handle);

      const combined = combine(conjunction);
      const effective = conjunction.filter(({ op }) => op !== "pass" && op !== "annotate").length;
      result = { conjunction: combined, changed: changed || combined.length < effective };
      conjunctions.set(handle, result);
      return result;
    };

    for (const handle in kernel.schemas) {
      const schema = kernel.schemas[handle];
      if (typeof schema === "boolean" || readsMarks.has(handle)) {
        continue;
      }

      const { conjunction, changed } = conjunctionOf(handle, schema);
      if (changed) {
        const expression = normalForm({ op: "all", of: conjunction });
        replaced.set(handle, { ...schema, keywords: [{ ...schema.keywords[0], sources: [], expression }] });
      }
    }

    return replaced;
  }
};

/**
 * The operations of a conjunction with the ones of the same kind combined,
 * in the order of the first of each kind
 *
 * @type (conjunction: Expression[]) => Expression[]
 */
const combine = (conjunction) => {
  /** @type Expression[] */
  const result = [];
  /** @type Map<string, number> */
  const byKind = new Map();
  /** @type Set<string> */
  const seen = new Set();

  for (const expression of conjunction) {
    // Nothing sees annotations in `fast`
    if (expression.op === "pass" || expression.op === "annotate") {
      continue;
    }

    const kind = combinable.has(expression.op) ? expression.op : undefined;
    if (kind !== undefined) {
      const index = byKind.get(kind);
      if (index === undefined) {
        byKind.set(kind, result.length);
        result.push(expression);
      } else {
        result[index] = combineTwo(result[index], expression);
      }
      continue;
    }

    // Only operations without subexpressions are compared, so it doesn't
    // serialize whole subtrees, and `apply`s by the schema
    const key = expression.op === "apply" ? expression.schema : subexpressions(expression).length === 0 ? JSON.stringify(expression) : undefined;
    if (key === undefined) {
      result.push(expression);
    } else if (!seen.has(key)) {
      seen.add(key);
      result.push(expression);
    }
  }

  return result;
};

/** The operations of the same kind that combine into one */
const combinable = new Set(["typeIs", "range", "stringLength", "itemCount", "propertyCount"]);

/** @type (a: Expression, b: Expression) => Expression */
const combineTwo = (a, b) => {
  if (a.op === "typeIs" && b.op === "typeIs") {
    return { op: "typeIs", types: intersectTypes(a.types, b.types) };
  } else if (a.op === "range" && b.op === "range") {
    /** @type Extract<Expression, { op: "range" }> */
    const range = { op: "range" };
    if (a.min !== undefined || b.min !== undefined) {
      const [min, exclusive] = tighter([a.min, !!a.exclusiveMin], [b.min, !!b.exclusiveMin], 1);
      range.min = min;
      if (exclusive) {
        range.exclusiveMin = true;
      }
    }
    if (a.max !== undefined || b.max !== undefined) {
      const [max, exclusive] = tighter([a.max, !!a.exclusiveMax], [b.max, !!b.exclusiveMax], -1);
      range.max = max;
      if (exclusive) {
        range.exclusiveMax = true;
      }
    }
    return range;
  } else if ((a.op === "stringLength" || a.op === "itemCount" || a.op === "propertyCount") && b.op === a.op) {
    const min = a.min === undefined ? b.min : b.min === undefined ? a.min : Math.max(a.min, b.min);
    const max = a.max === undefined ? b.max : b.max === undefined ? a.max : Math.min(a.max, b.max);
    return { op: a.op, ...min !== undefined && { min }, ...max !== undefined && { max } };
  } else {
    throw Error(`Can't combine '${a.op}' and '${b.op}'`);
  }
};

/**
 * The tighter of two limits: the greater of two minimums (`direction` 1) or
 * the lesser of two maximums (-1), exclusive if either equal one is
 *
 * @type (a: [number | undefined, boolean], b: [number | undefined, boolean], direction: 1 | -1) => [number, boolean]
 */
const tighter = ([a, aExclusive], [b, bExclusive], direction) => {
  if (a === undefined) {
    return [/** @type number */(b), bExclusive];
  } else if (b === undefined || a * direction > b * direction) {
    return [a, aExclusive];
  } else if (b * direction > a * direction) {
    return [b, bExclusive];
  } else {
    return [a, aExclusive || bExclusive];
  }
};

/**
 * The types both allow. `integer` is a `number`, so `number` and `integer`
 * is `integer`.
 *
 * @type (a: TypeName[], b: TypeName[]) => TypeName[]
 */
const intersectTypes = (a, b) => {
  /** @type Set<TypeName> */
  const types = new Set();
  for (const type of a) {
    if (b.includes(type)) {
      types.add(type);
    } else if ((type === "integer" && b.includes("number")) || (type === "number" && b.includes("integer"))) {
      types.add("integer");
    }
  }
  return [...types];
};
