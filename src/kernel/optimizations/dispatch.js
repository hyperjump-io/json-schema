import { normalForm } from "../normalize.js";
import { isInert } from "../optimize.js";

/**
 * @import { Json } from "@hyperjump/browser/json"
 * @import { CompiledSchema, Expression, Handle, KeywordGroup, TypeName } from "../kernel.d.ts"
 * @import { Optimization } from "../optimize.js"
 */

/**
 * Scalar values. A Set compares them as JSON does: `1` is `1.0`, but not
 * `"1"`.
 *
 * @typedef {Set<Json>} Values
 */

/**
 * What an expression needs of an object's properties to pass it: the names
 * it has to have (`required`), the values a property can have if it's there
 * (`values`), and the only names it can have, or `null` if it can have any
 * (`allowed`)
 *
 * @typedef {{ required: Set<string>; values: Map<string, Values>; allowed: Set<string> | null }} ObjectFacts
 */

/**
 * Pick what `any` and `one` evaluate, where their expressions can't all
 * pass the same instances:
 *
 * - **By type.** An `any` of expressions that only check the type, like
 *   `anyOf` of `{ "type": "boolean" }` and `{ "type": "null" }`, is a
 *   `typeIs` with all their types. A `one` whose expressions can't pass the
 *   same type, like `oneOf` with a different `type` in each schema, is a
 *   `cases` with a `typeIs` condition for each, otherwise `fail`. The
 *   evaluators look a `cases` like that up by type. An `any` like that
 *   isn't a `cases`: it already stops at the first that passes, and
 *   dispatching was slower.
 * - **By tag.** Among the expressions that can pass an object, by the value
 *   of a property they constrain, like `"type": { "const": "SEQ" }` in each
 *   schema of a `oneOf` (a discriminator), or by which property an object
 *   has, where they're closed and require different properties, like
 *   `{ "eq": … }` or `{ "gt": … }`. Each tag is a case that evaluates only
 *   the expressions that can pass it, which can be type dispatched or
 *   tagged again. For a schema that applies itself through every branch,
 *   like a syntax tree, evaluating every branch takes time exponential in
 *   the instance's depth, and this makes it linear.
 *
 * What isn't evaluated would fail, so the result, the marks, and the
 * annotations that are kept are the same. Plugins see only what's evaluated,
 * so a `oneOf` gets errors from the schema for its tag, not from every
 * schema.
 *
 * A value that couldn't be parsed passes every schema and equals every
 * value, so a tag that couldn't be parsed would pass every `propertyEquals`.
 * A tag is only looked up where `not(property(name, fail))` passes, which is
 * when the object has the property and it was parsed, and otherwise the
 * expression is evaluated as it was.
 *
 * @type Optimization
 */
export default {
  optimize(kernel, mode) {
    /** @type Map<Handle, CompiledSchema> */
    const replaced = new Map();

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

    /** @type Map<Handle, Values | null> */
    const schemaValues = new Map();

    /**
     * The scalar values an expression can pass, or `null` if that isn't
     * known, like `possibleTypes`
     *
     * @type (expression: Expression) => Values | null
     */
    const possibleValues = (expression) => {
      switch (expression.op) {
        case "fail":
          return new Set();
        case "equals":
          return isScalar(expression.value) ? new Set([expression.value]) : null;
        case "oneOfValues":
          return expression.values.every(isScalar) ? new Set(expression.values) : null;
        case "all": {
          /** @type Values | null */
          let result = null;
          for (const subexpression of expression.of) {
            const values = possibleValues(subexpression);
            if (values !== null) {
              result = result === null ? values : intersect(result, values);
            }
          }
          return result;
        }
        case "any":
        case "one": {
          const values = expression.of.map(possibleValues);
          return values.some((value) => value === null) ? null : union(/** @type Values[] */ (values));
        }
        case "apply": {
          if (schemaValues.has(expression.schema)) {
            return /** @type Values | null */ (schemaValues.get(expression.schema));
          }
          const compiled = kernel.schemas[expression.schema];
          if (typeof compiled === "boolean") {
            return compiled ? null : new Set();
          }
          schemaValues.set(expression.schema, null);
          const values = possibleValues({ op: "all", of: compiled.keywords.map(({ expression }) => expression) });
          schemaValues.set(expression.schema, values);
          return values;
        }
        default:
          return null;
      }
    };

    /** @type Map<Handle, ObjectFacts> */
    const schemaFacts = new Map();

    /**
     * What an expression needs of an object's properties. Leaving out what
     * isn't known only makes the facts weaker, so a schema that's still
     * being worked out has none.
     *
     * @type (expression: Expression) => ObjectFacts
     */
    const objectFacts = (expression) => {
      switch (expression.op) {
        case "hasProperty":
          return { ...noFacts, required: new Set([expression.name]) };
        case "propertyEquals": {
          const { name, value } = expression;
          return {
            ...noFacts,
            required: new Set([name]),
            values: isScalar(value) ? new Map([[name, new Set([value])]]) : noFacts.values
          };
        }
        case "property": {
          const values = possibleValues(expression.of);
          return values === null ? noFacts : { ...noFacts, values: new Map([[expression.name, values]]) };
        }
        case "eachProperty": {
          const { select } = expression;
          const closed = "except" in select && select.except.patterns.length === 0 && possibleTypes(expression.of)?.size === 0;
          return closed ? { ...noFacts, allowed: new Set(select.except.names) } : noFacts;
        }
        case "all": {
          /** @type ObjectFacts */
          const facts = { required: new Set(), values: new Map(), allowed: null };
          for (const subexpression of expression.of) {
            const { required, values, allowed } = objectFacts(subexpression);
            required.forEach((name) => facts.required.add(name));
            for (const [name, propertyValues] of values) {
              const known = facts.values.get(name);
              facts.values.set(name, known === undefined ? propertyValues : intersect(known, propertyValues));
            }
            if (allowed !== null) {
              facts.allowed = facts.allowed === null ? allowed : facts.allowed.intersection(allowed);
            }
          }
          return facts;
        }
        case "any":
        case "one": {
          // Only what can pass an object says anything about objects
          const each = expression.of.filter(canPassObject).map(objectFacts);
          if (each.length === 0) {
            return noFacts;
          }
          const [first, ...rest] = each;
          /** @type ObjectFacts */
          const facts = {
            required: new Set([...first.required].filter((name) => rest.every(({ required }) => required.has(name)))),
            values: new Map(),
            allowed: each.every(({ allowed }) => allowed !== null) ? new Set(each.flatMap(({ allowed }) => [...allowed ?? []])) : null
          };
          for (const name of first.values.keys()) {
            if (rest.every(({ values }) => values.has(name))) {
              facts.values.set(name, union(each.map(({ values }) => /** @type Values */ (values.get(name)))));
            }
          }
          return facts;
        }
        case "apply": {
          const known = schemaFacts.get(expression.schema);
          if (known !== undefined) {
            return known;
          }
          const compiled = kernel.schemas[expression.schema];
          if (typeof compiled === "boolean") {
            return noFacts;
          }
          schemaFacts.set(expression.schema, noFacts);
          const facts = objectFacts({ op: "all", of: compiled.keywords.map(({ expression }) => expression) });
          schemaFacts.set(expression.schema, facts);
          return facts;
        }
        default:
          return noFacts;
      }
    };

    /** @type (expression: Expression) => boolean */
    const canPassObject = (expression) => possibleTypes(expression)?.has("object") ?? true;

    /**
     * An `any` or `one` of some of the expressions, which is dispatched
     * again
     *
     * @type (op: "any" | "one", of: Expression[]) => Expression
     */
    const unionOf = (op, of) => {
      if (of.length < 2) {
        return of.length === 0 ? { op: "fail" } : of[0];
      }
      /** @type Extract<Expression, { op: "all" | "any" | "one" }> */
      const expression = { op, of };
      return byType(expression) ?? byTag(expression) ?? expression;
    };

    /** @type (expression: Extract<Expression, { op: "all" | "any" | "one" }>) => Expression | undefined */
    const byTag = (expression) => {
      if (expression.op === "all") {
        return undefined;
      }

      const { op, of } = expression;
      const objects = of.filter(canPassObject);
      if (objects.length < 2) {
        return undefined;
      }
      const tag = bestTag(objects.map(objectFacts));
      if (tag === undefined) {
        return undefined;
      }

      // Cases with the same expressions share one, which evaluators build once
      /** @type Map<string, Expression> */
      const unions = new Map();
      /** @type (indexes: number[]) => Expression */
      const unionAt = (indexes) => {
        const key = indexes.join();
        let union = unions.get(key);
        if (union === undefined) {
          union = unionOf(op, indexes.map((index) => objects[index]));
          unions.set(key, union);
        }
        return union;
      };

      /** @type [Expression, Expression | null][] */
      let cases;
      if (tag.by === "value") {
        const { name } = tag;
        cases = [
          [isParsedProperty(name), {
            op: "cases",
            cases: tag.cases.map(([value, indexes]) => [{ op: "propertyEquals", name, value }, unionAt(indexes)]),
            otherwise: unionAt(tag.other)
          }],
          [{ op: "all", of: [isObject, { op: "hasProperty", name }] }, expression],
          [isObject, unionAt(tag.absent)]
        ];
      } else {
        cases = [
          ...tag.cases.map(([name, indexes]) => /** @type [Expression, Expression] */ ([isParsedProperty(name), unionAt(indexes)])),
          [{ op: "all", of: [isObject, { op: "any", of: tag.cases.map(([name]) => ({ op: "hasProperty", name })) }] }, expression],
          [isObject, unionAt(tag.absent)]
        ];
      }

      // What's left isn't an object, so it has no tag
      const others = of.filter((subexpression) => !onlyObjects(subexpression));
      /** @type Extract<Expression, { op: "all" | "any" | "one" }> */
      const otherwise = { op, of: others };
      return { op: "cases", cases, otherwise: others.length < 2 ? unionOf(op, others) : byType(otherwise) ?? otherwise };
    };

    /**
     * Whether an expression can only pass objects, or nothing
     *
     * @type (expression: Expression) => boolean
     */
    const onlyObjects = (expression) => {
      const types = possibleTypes(expression);
      return types !== null && [...types].every((type) => type === "object");
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
          return byType(rewritten) ?? byTag(rewritten) ?? rewritten;
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

/**
 * @typedef {{ by: "value"; name: string; cases: [Json, number[]][]; other: number[]; absent: number[] }
 *   | { by: "key"; cases: [string, number[]][]; absent: number[] }} Tag
 */

/**
 * The tag that leaves the fewest expressions to evaluate for an object, in
 * the case that leaves the most, by the indexes of the expressions each case
 * leaves. It has to leave fewer than all of them.
 *
 * - By value: for each value of the property, the expressions that allow the
 *   property and that value; for any other value, those that allow the
 *   property and don't constrain it; and without it, those that don't
 *   require it.
 * - By key: for each property some of them don't allow, the ones that do;
 *   and without any of those properties, the ones that don't require one.
 *   An object that has two of them only passes expressions that allow both,
 *   so the first one it has decides.
 *
 * @type (facts: ObjectFacts[]) => Tag | undefined
 */
const bestTag = (facts) => {
  /** @type (name: string) => number[] */
  const allowing = (name) => indexesOf(facts, ({ allowed }) => allowed === null || allowed.has(name));

  /** @type Tag | undefined */
  let best;
  let fewest = facts.length;

  /** @type Set<string> */
  const constrained = new Set(facts.flatMap(({ values }) => [...values.keys()]));
  for (const name of constrained) {
    const allowed = allowing(name);
    /** @type Values[] */
    const values = facts.map(({ values }) => values.get(name) ?? new Set());
    /** @type [Json, number[]][] */
    const cases = [...union(values)].map((value) => [value, allowed.filter((index) => !facts[index].values.has(name) || values[index].has(value))]);
    /** @type Tag */
    const tag = {
      by: "value",
      name,
      cases,
      other: allowed.filter((index) => !facts[index].values.has(name)),
      absent: indexesOf(facts, ({ required }) => !required.has(name))
    };
    const most = Math.max(tag.other.length, tag.absent.length, ...cases.map(([, indexes]) => indexes.length));
    if (most < fewest) {
      best = tag;
      fewest = most;
    }
  }

  /** @type [string, number[]][] */
  const cases = [];
  for (const name of new Set(facts.flatMap(({ required }) => [...required]))) {
    const allowed = allowing(name);
    if (allowed.length < facts.length) {
      cases.push([name, allowed]);
    }
  }
  if (cases.length > 0) {
    /** @type Tag */
    const tag = { by: "key", cases, absent: indexesOf(facts, ({ required }) => cases.every(([name]) => !required.has(name))) };
    const most = Math.max(tag.absent.length, ...cases.map(([, indexes]) => indexes.length));
    if (most < fewest) {
      best = tag;
    }
  }

  return best;
};

/** @type <T>(items: T[], predicate: (item: T) => boolean) => number[] */
const indexesOf = (items, predicate) => items.flatMap((item, index) => predicate(item) ? [index] : []);

/** @type ObjectFacts */
const noFacts = Object.freeze({ required: new Set(), values: new Map(), allowed: null });

/** @type Expression */
const isObject = { op: "typeIs", types: ["object"] };

/**
 * Passes an object that has the property, if its value was parsed
 *
 * @type (name: string) => Expression
 */
const isParsedProperty = (name) => ({ op: "not", of: { op: "property", name, of: { op: "fail" } } });

/** @type (value: Json) => boolean */
const isScalar = (value) => value === null || typeof value !== "object";

/** @type (a: Values, b: Values) => Values */
const intersect = (a, b) => a.intersection(b);

/** @type (values: Values[]) => Values */
const union = (values) => new Set(values.flatMap((each) => [...each]));
