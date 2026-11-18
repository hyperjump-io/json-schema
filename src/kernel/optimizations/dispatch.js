import { mapSubexpressions } from "../kernel.js";
import { normalForm } from "../normalize.js";
import { isInert } from "../inert.js";

/**
 * @import { Json } from "@hyperjump/browser"
 * @import { KernelSchema, Expression, Handle, KeywordGroup, Scalar, TypeName } from "../kernel.d.ts"
 * @import { Optimization } from "../optimize.js"
 */

/**
 * Scalar values. A Set compares them as JSON does: `1` is `1.0`, but not
 * `"1"`.
 *
 * @typedef {Set<Scalar>} Values
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
 *   `typeSwitch` with a branch for each, otherwise `fail`. In `fast`, an
 *   `any` like that is too, because it tried the ones before the one for
 *   the type first, and an `any` of one `typeSwitch` and types is one
 *   `typeSwitch` where the types pass.
 * - **By value.** In `fast`, an `any` or `one` of expressions that only
 *   pass some scalars, like `anyOf` of `const`s, is a `oneOfValues`.
 * - **By tag.** Among the expressions that can pass an object, by the value
 *   of a property they constrain, like `"type": { "const": "SEQ" }` in each
 *   schema of a `oneOf` (a discriminator), which is a `propertySwitch`, or
 *   by which property an object has, where they're closed and require
 *   different properties, like `{ "eq": … }` or `{ "gt": … }`, which is a
 *   `keySwitch`. Each tag is a case that evaluates only the expressions that
 *   can pass it, which can be type dispatched or tagged again. For a schema
 *   that applies itself through every branch, like a syntax tree,
 *   evaluating every branch takes time exponential in the instance's
 *   depth, and this makes it linear.
 *
 * What isn't evaluated would fail, so the result, the marks, and the
 * annotations that are kept are the same. Plugins see only what's evaluated,
 * so a `oneOf` gets errors from the schema for its tag, not from every
 * schema. A value that couldn't be parsed equals every value and passes
 * every schema, so where a tag couldn't be parsed, the expression is
 * evaluated as it was: it's the switch's `unparsed`.
 *
 * @type Optimization
 */
export default {
  optimize(kernel, mode) {
    /** @type Map<Handle, KernelSchema> */
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
        case "inline":
          return intersection(expression.keywords.map(({ expression }) => expression));
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

    /** @type Map<Handle, Values | undefined> */
    const schemaValuesChecked = new Map();

    /**
     * The values, if an expression passes those scalar values and nothing
     * else, like `{ "const": "a" }`, maybe with a `type` they have, or an
     * `anyOf` of them, maybe through a schema whose only groups with an
     * effect do that. A schema that's still being worked out, because it
     * applies itself, doesn't.
     *
     * @type (expression: Expression) => Values | undefined
     */
    const valuesChecked = (expression) => {
      switch (expression.op) {
        case "equals":
          return isScalar(expression.value) ? new Set([expression.value]) : undefined;
        case "oneOfValues":
          return expression.values.every(isScalar) ? new Set(expression.values) : undefined;
        case "inline":
          return valuesChecked({ op: "all", of: expression.keywords.map(({ expression }) => expression) });
        case "all": {
          const { of } = expression;
          /** @type Values | undefined */
          let values;
          /** @type TypeName[][] */
          const types = [];
          for (const subexpression of of) {
            if (isInert(subexpression, mode)) {
              continue;
            } else if (subexpression.op === "typeIs") {
              types.push(subexpression.types);
              continue;
            }
            const checked = valuesChecked(subexpression);
            if (checked === undefined) {
              return undefined;
            }
            values = values === undefined ? checked : intersect(values, checked);
          }
          if (values === undefined) {
            // A type with only a few values, like `null`, is those values
            const few = types.find((each) => each.every((type) => Object.hasOwn(typeValues, type)));
            if (few === undefined) {
              return undefined;
            }
            values = new Set(few.flatMap((type) => typeValues[/** @type keyof typeof typeValues */ (type)]));
          }
          return new Set([...values].filter((value) => types.every((each) => hasType(value, each))));
        }
        case "any":
        case "one": {
          const each = expression.of.map(valuesChecked);
          if (each.some((values) => values === undefined)) {
            return undefined;
          }
          const all = /** @type Values[] */ (each);
          return expression.op === "any"
            ? union(all)
            : new Set([...union(all)].filter((value) => all.filter((values) => values.has(value)).length === 1));
        }
        case "apply": {
          if (schemaValuesChecked.has(expression.schema)) {
            return schemaValuesChecked.get(expression.schema);
          }
          const compiled = kernel.schemas[expression.schema];
          if (typeof compiled === "boolean") {
            return compiled ? undefined : new Set();
          }
          schemaValuesChecked.set(expression.schema, undefined);
          const values = valuesChecked({ op: "all", of: compiled.keywords.map(({ expression }) => expression) });
          schemaValuesChecked.set(expression.schema, values);
          return values;
        }
        case "fail":
          return new Set();
        default:
          return undefined;
      }
    };

    /** @type Map<Handle, Extract<Expression, { op: "typeSwitch" }> | undefined> */
    const schemaSwitches = new Map();

    /**
     * The `typeSwitch`, if an expression is one once it's rewritten, maybe
     * through schemas whose only group with an effect is one. Without a
     * dynamic scope, applying a schema isn't observable in `fast`, so its
     * switch can be evaluated in its place. A schema that's still being
     * worked out, because it applies itself, isn't one.
     *
     * @type (expression: Expression) => Extract<Expression, { op: "typeSwitch" }> | undefined
     */
    const switchOf = (expression) => {
      if (expression.op === "typeSwitch") {
        return expression;
      } else if (expression.op === "any" || expression.op === "one") {
        const rewritten = rewrite(expression);
        return rewritten.op === "typeSwitch" ? rewritten : undefined;
      } else if (expression.op !== "apply" || kernel.reads.dynamicScope.length > 0) {
        return undefined;
      } else if (schemaSwitches.has(expression.schema)) {
        return schemaSwitches.get(expression.schema);
      }
      const compiled = kernel.schemas[expression.schema];
      if (typeof compiled === "boolean") {
        return undefined;
      }
      schemaSwitches.set(expression.schema, undefined);
      const groups = compiled.keywords.filter(({ expression }) => !isInert(expression, mode));
      const typeSwitch = groups.length === 1 ? switchOf(groups[0].expression) : undefined;
      schemaSwitches.set(expression.schema, typeSwitch);
      return typeSwitch;
    };

    /**
     * An `any` of a `typeSwitch` and types, like `anyOf` of a `$ref` to a
     * `oneOf` and `{ "type": "null" }`, as one `typeSwitch` where the types
     * pass. Otherwise, an instance of the types was dispatched, and failed,
     * before it was checked. Only when nothing reads marks, which the switch
     * could make for an instance the types pass.
     *
     * @type (expression: Extract<Expression, { op: "all" | "any" | "one" }>) => Expression | undefined
     */
    const withTypes = (expression) => {
      if (kernel.reads.evaluated.length > 0) {
        return undefined;
      }

      /** @type TypeName[] */
      const types = [];
      /** @type Extract<Expression, { op: "typeSwitch" }>[] */
      const switches = [];
      for (const subexpression of expression.of) {
        const checked = typesChecked(subexpression);
        const typeSwitch = checked === undefined ? switchOf(subexpression) : undefined;
        if (checked !== undefined) {
          types.push(...checked);
        } else if (typeSwitch !== undefined) {
          switches.push(typeSwitch);
        } else {
          return undefined;
        }
      }
      if (switches.length !== 1 || types.length === 0 || (types.includes("integer") && !types.includes("number"))) {
        return undefined;
      }

      const [{ cases, otherwise }] = switches;
      /** @type Expression */
      const pass = { op: "pass" };
      return {
        op: "typeSwitch",
        cases: { ...cases, ...Object.fromEntries(types.filter((type) => type !== "integer").map((type) => [type, pass])) },
        otherwise
      };
    };

    /** @type (expression: Extract<Expression, { op: "all" | "any" | "one" }>) => Expression | undefined */
    const byType = (expression) => {
      if (expression.op === "all") {
        return undefined;
      } else if (expression.op === "any") {
        const types = expression.of.map(typesChecked);
        if (types.every((type) => type !== undefined)) {
          return { op: "typeIs", types: [...new Set(types.flat())] };
        }
      }

      // An `anyOf` or `oneOf` of constants, maybe with `null`, is an `enum`:
      // one lookup, not a call for each. Only in `fast`, because with
      // plugins, the error would be the `anyOf`'s, not each constant's.
      const values = mode.fast ? valuesChecked(expression) : undefined;
      if (values !== undefined) {
        return values.size === 0 ? { op: "fail" } : { op: "oneOfValues", values: [...values] };
      } else if (expression.op === "any") {
        const merged = mode.fast ? withTypes(expression) : undefined;
        if (merged !== undefined || !mode.fast) {
          return merged;
        }
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
        op: "typeSwitch",
        cases: Object.fromEntries(candidates.flatMap(([types, subexpression]) => [...types].map((type) => [type, subexpression]))),
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
        case "inline":
          return possibleValues({ op: "all", of: expression.keywords.map(({ expression }) => expression) });
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
        case "inline":
          return objectFacts({ op: "all", of: expression.keywords.map(({ expression }) => expression) });
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
          // All of them, without the tag, which would pick the same tag again
          union = indexes.length === objects.length
            ? { op, of: objects }
            : unionOf(op, indexes.map((index) => objects[index]));
          unions.set(key, union);
        }
        return union;
      };

      /** @type Expression */
      const forObjects = tag.by === "value"
        ? {
            op: "propertySwitch",
            name: tag.name,
            cases: tag.cases.map(([value, indexes]) => [value, unionAt(indexes)]),
            other: unionAt(tag.other),
            absent: unionAt(tag.absent),
            // A tag that couldn't be parsed equals every value
            unparsed: expression
          }
        : {
            op: "keySwitch",
            cases: tag.cases.map(([name, indexes]) => [name, unionAt(indexes)]),
            none: unionAt(tag.absent),
            // A property that couldn't be parsed passes what doesn't allow it
            unparsed: expression
          };

      // What's left isn't an object, so it has no tag
      const others = of.filter((subexpression) => !onlyObjects(subexpression));
      /** @type Extract<Expression, { op: "all" | "any" | "one" }> */
      const otherwise = { op, of: others };
      const forOthers = others.length < 2 ? unionOf(op, others) : byType(otherwise) ?? otherwise;
      return forOthers.op === "typeSwitch"
        ? { op: "typeSwitch", cases: { ...forOthers.cases, object: forObjects }, otherwise: forOthers.otherwise }
        : { op: "typeSwitch", cases: { object: forObjects }, otherwise: forOthers };
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

    /** @type (expression: Expression) => Expression */
    const rewrite = (expression) => {
      switch (expression.op) {
        case "all":
        case "any":
        case "one": {
          const rewritten = /** @type typeof expression */ (mapSubexpressions(expression, rewrite));
          return byType(rewritten) ?? byTag(rewritten) ?? rewritten;
        }
        default:
          return mapSubexpressions(expression, rewrite);
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
const constrainsTypes = new Set(["fail", "typeIs", "equals", "oneOfValues", "all", "any", "one", "apply", "inline"]);

/**
 * @typedef {{ by: "value"; name: string; cases: [Scalar, number[]][]; other: number[]; absent: number[] }
 *   | { by: "key"; cases: [string, number[]][]; absent: number[] }} Tag
 */

/**
 * The tag that leaves the fewest expressions to evaluate for an object, in
 * the case that leaves the most, by the indexes of the expressions each case
 * leaves. It has to leave fewer than all of them. If none does, it's the
 * tag by value that leaves the fewest when an object has the property, where
 * none of them require it, like `"name": { "const": "Ubuntu" }` in each
 * schema of an `anyOf` without `required`. An object without it evaluates
 * all of them, as it did without the tag.
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

  // A tag none of them requires, which leaves fewer when an object has it
  /** @type Tag | undefined */
  let present;
  let fewestPresent = facts.length;

  /** @type Set<string> */
  const constrained = new Set(facts.flatMap(({ values }) => [...values.keys()]));
  for (const name of constrained) {
    const allowed = allowing(name);
    /** @type Values[] */
    const values = facts.map(({ values }) => values.get(name) ?? new Set());
    /** @type [Scalar, number[]][] */
    const cases = [...union(values)].map((value) => [value, allowed.filter((index) => !facts[index].values.has(name) || values[index].has(value))]);
    /** @type Tag */
    const tag = {
      by: "value",
      name,
      cases,
      other: allowed.filter((index) => !facts[index].values.has(name)),
      absent: indexesOf(facts, ({ required }) => !required.has(name))
    };
    const mostPresent = Math.max(tag.other.length, ...cases.map(([, indexes]) => indexes.length));
    const most = Math.max(mostPresent, tag.absent.length);
    if (most < fewest) {
      best = tag;
      fewest = most;
    } else if (tag.absent.length === facts.length && mostPresent < fewestPresent) {
      present = tag;
      fewestPresent = mostPresent;
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

  return best ?? present;
};

/** @type <T>(items: T[], predicate: (item: T) => boolean) => number[] */
const indexesOf = (items, predicate) => items.flatMap((item, index) => predicate(item) ? [index] : []);

/** @type ObjectFacts */
const noFacts = Object.freeze({ required: new Set(), values: new Map(), allowed: null });

/** @type (value: Json) => value is Scalar */
const isScalar = (value) => value === null || typeof value !== "object";

/** The types with only a few values, and their values */
const typeValues = { null: [null], boolean: [true, false] };

/** @type (value: Scalar, types: TypeName[]) => boolean */
const hasType = (value, types) => types.includes(typeOf(value))
  || (types.includes("integer") && Number.isInteger(value));

/** @type (a: Values, b: Values) => Values */
const intersect = (a, b) => a.intersection(b);

/** @type (values: Values[]) => Values */
const union = (values) => new Set(values.flatMap((each) => [...each]));
