import { codePointLength, instanceEqual } from "../keywords/utilities.js";
import { jsInstance } from "./instance.js";
import { domains, subexpressions } from "./kernel.js";

/**
 * @import { Json } from "@hyperjump/browser"
 * @import { Expression, ExpressionOf, Handle, JsonTypeName, Limits, TypeName } from "./kernel.d.ts"
 */

/**
 * Whether every instance that passes one expression passes another, as far
 * as it's known from the expressions: `true` is sure, and `false` is "not
 * known", never "it doesn't". It's about the result only, not about what
 * either one marks or annotates.
 *
 * `schemas` is what each schema an `apply` can apply is: its keyword
 * groups' expressions, which all have to pass (none for `true`, and `fail`
 * for `false`). A schema that isn't in it implies only itself.
 *
 * - Anything implies what always passes (`pass`, `annotate`, and a
 *   `format` that doesn't assert), and `fail` implies anything
 * - An expression implies `all` if it implies every one, and `any` if it
 *   implies one of them. `all` implies what one of its expressions
 *   implies, and `any` and `one` what every one of theirs does. `apply` and
 *   `inline` are `all` of the schema's groups.
 * - Anything implies `not` of what it excludes ({@link excludes})
 * - `typeIs` implies a `typeIs` with its types, and any operation that
 *   doesn't apply to its types. Limits imply looser limits of the same
 *   kind. `equals` and `oneOfValues` imply what their values pass, where
 *   an operation can be checked without a schema.
 * - An operation on a property, an item, or property names implies the same
 *   operation of what its expression implies, and `not` implies `not` of
 *   what implies its expression
 * - Anything else only implies an expression that's the same, and one that
 *   reads marks or the dynamic scope, or is `opaque`, doesn't imply even
 *   that, because it can have a different result where the other one is
 *
 * A schema that's being compared when it's reached again, because it
 * applies itself, isn't known to imply anything, so two schemas that apply
 * themselves the same way aren't known to imply each other.
 *
 * @type (schemas: ReadonlyMap<Handle, Expression[]>) => (a: Expression, b: Expression) => boolean
 */
export const implies = (schemas) => relations(schemas).implies;

/**
 * Whether no instance passes both of two expressions, as far as it's known
 * from the expressions: `true` is sure, and `false` is "not known". It's
 * `implies` of one and `not` of the other, which is how `implies` knows
 * what implies a `not`. `schemas` is as in {@link implies}.
 *
 * An operation passes every instance it doesn't apply to, so `range`s that
 * don't overlap both pass a string. Two expressions exclude each other if
 * they do for each type of instance:
 *
 * - One of them can't pass the type (`typeIs`, `equals`, `oneOfValues`,
 *   `fail`)
 * - Their limits for the type don't overlap, or one side's own don't
 * - Every value of the type one allows fails an operation of the other
 * - One is `not` of something the other implies for the type
 * - For objects, they have expressions for the same property that exclude
 *   each other, and one of them requires the property
 *
 * Each side is everything that has to pass: what's in `all`, and the
 * groups of the schemas it applies. `any` and `one` exclude what every one
 * of their expressions does.
 *
 * @type (schemas: ReadonlyMap<Handle, Expression[]>) => (a: Expression, b: Expression) => boolean
 */
export const excludes = (schemas) => relations(schemas).excludes;

/**
 * For some expressions, the ones each might pass an instance with: the
 * indexes, in order, of the others that a cheap test doesn't rule out. One
 * that's ruled out is sure to exclude it, so it isn't worth comparing, and
 * neither implies the other unless nothing passes it. `schemas` is as in
 * {@link implies}.
 *
 * It's for a long `anyOf` or `oneOf`, where comparing every pair takes
 * time that grows with the square of how many there are. Each expression
 * gets keys in whichever of these says the most for all of them, and two
 * with no key in common are ruled out:
 *
 * - The types it can pass, if that isn't every type
 * - The values it allows (`equals`, `oneOfValues`)
 * - For one that only passes objects, the values it allows for a property
 *   it requires, like a discriminator
 *
 * An expression without a key there is compared with every other one, and
 * so is one that nothing passes as far as its types say, because it
 * implies everything.
 *
 * @type (schemas: ReadonlyMap<Handle, Expression[]>) => (expressions: Expression[]) => (index: number) => number[]
 */
export const overlapping = (schemas) => relations(schemas).overlapping;

/**
 * For some expressions, the ones each might imply or be implied by, like
 * {@link overlapping}. It rules out more: a required property's values
 * count for any expression that can pass an object, not only for one that
 * passes nothing else. Two like that with different values might both
 * pass a string, so they don't exclude each other, but an object that
 * passes one fails the other, so neither implies the other unless no
 * object passes it.
 *
 * The properties an expression requires are keys too. One that implies
 * another requires every property the other does, so two that require
 * something and nothing in common don't imply each other. Each is found
 * by the property it requires that the fewest of them do, so a property
 * they all require doesn't make them all comparable.
 *
 * An expression nothing passes implies everything, and `implies` can know
 * that it implies another from one of its parts, whatever the others say.
 * So one with an `any` or `one`, whose expressions might all say the same
 * thing, only has its types as keys, and one with values isn't keyed by
 * its properties.
 *
 * @type (schemas: ReadonlyMap<Handle, Expression[]>) => (expressions: Expression[]) => (index: number) => number[]
 */
export const comparable = (schemas) => relations(schemas).comparable;

/**
 * @typedef {{
 *   implies: (a: Expression, b: Expression) => boolean;
 *   excludes: (a: Expression, b: Expression) => boolean;
 *   overlapping: (expressions: Expression[]) => (index: number) => number[];
 *   comparable: (expressions: Expression[]) => (index: number) => number[];
 * }} Relations
 */

/** @type (schemas: ReadonlyMap<Handle, Expression[]>) => Relations */
const relations = (schemas) => {
  // What's known about each pair of schemas. A pair that's being compared
  // isn't known to imply, and whatever is found from there is still sure.
  const known = pairs();

  /** @type (a: Handle, b: Handle) => boolean */
  const schemaImplies = (a, b) => {
    if (a === b) {
      return true;
    }

    let result = known.get(a, b);
    if (result === undefined) {
      known.set(a, b, false);
      const bGroups = schemas.get(b);
      result = bGroups !== undefined && bGroups.every((group) => expressionImplies({ op: "apply", schema: a }, group));
      known.set(a, b, result);
    }
    return result;
  };

  // The schemas being looked into on each side, so one that applies itself
  // isn't looked into forever
  /** @type Set<Handle> */
  const aExpanding = new Set();
  /** @type Set<Handle> */
  const bExpanding = new Set();

  /** @type (expanding: Set<Handle>, handle: Handle, test: (groups: Expression[]) => boolean) => boolean */
  const expand = (expanding, handle, test) => {
    const groups = schemas.get(handle);
    if (groups === undefined || expanding.has(handle)) {
      return false;
    }

    expanding.add(handle);
    const result = test(groups);
    expanding.delete(handle);
    return result;
  };

  /** @type (a: Expression, b: Expression) => boolean */
  const expressionImplies = (a, b) => {
    if (alwaysPasses(b) || a.op === "fail") {
      return true;
    }

    // What says exactly what its parts say
    if (b.op === "all") {
      return b.of.every((of) => expressionImplies(a, of));
    } else if (b.op === "inline") {
      return b.keywords.every(({ expression }) => expressionImplies(a, expression));
    } else if (hasBothLimits(b)) {
      return expressionImplies(a, withoutLimit(b, "max")) && expressionImplies(a, withoutLimit(b, "min"));
    } else if (a.op === "any" || a.op === "one") {
      return a.of.every((of) => expressionImplies(of, b));
    } else if (a.op === "apply" && b.op === "apply") {
      return schemaImplies(a.schema, b.schema);
    } else if (b.op === "apply") {
      return expand(bExpanding, b.schema, (groups) => groups.every((group) => expressionImplies(a, group)));
    } else if (a.op === "apply") {
      return expand(aExpanding, a.schema, (groups) => expressionImplies({ op: "all", of: groups }, b));
    }

    if (b.op === "not" && expressionExcludes(a, b.of)) {
      return true;
    }

    // What says more than is needed: one part is enough
    if (a.op === "all" || a.op === "inline") {
      const of = a.op === "inline" ? a.keywords.map(({ expression }) => expression) : a.of;
      if (of.some((each) => expressionImplies(each, b))) {
        return true;
      }
    }
    if (b.op === "any") {
      return b.of.some((of) => expressionImplies(a, of));
    }

    return operationImplies(a, b);
  };

  /** @type (a: Expression, b: Expression) => boolean */
  const operationImplies = (a, b) => {
    const bDomain = domains[b.op];

    switch (a.op) {
      case "typeIs":
        if (b.op === "typeIs") {
          return a.types.every((type) => allowsType(b.types, type));
        }
        return bDomain !== undefined && !allowsType(a.types, bDomain) && !(bDomain === "number" && a.types.includes("integer"));
      case "equals":
        return valuePasses(a.value, b) === true;
      case "oneOfValues":
        return a.values.every((value) => valuePasses(value, b) === true);
      case "range":
        return b.op === "range" && rangeImplies(a, b);
      case "stringLength":
      case "itemCount":
      case "propertyCount":
        return b.op === a.op && limitsImply(a, b);
      case "propertyEquals":
        if (b.op === "hasProperty") {
          return a.name === b.name;
        }
        break;
      case "property":
        if (b.op === "property") {
          return a.name === b.name && expressionImplies(a.of, b.of);
        }
        break;
      case "item":
        if (b.op === "item") {
          return a.index === b.index && expressionImplies(a.of, b.of);
        }
        break;
      case "eachItem":
        if (b.op === "eachItem") {
          return "from" in a && "from" in b && a.from <= b.from && expressionImplies(a.of, b.of);
        }
        break;
      case "eachProperty":
        if (b.op === "eachProperty") {
          return !("unevaluated" in a.select) && same(a.select, b.select) && expressionImplies(a.of, b.of);
        }
        break;
      case "eachPropertyName":
        if (b.op === "eachPropertyName") {
          return expressionImplies(a.of, b.of);
        }
        break;
      case "not":
        if (b.op === "not") {
          return expressionImplies(b.of, a.of);
        }
        break;
    }

    return !dependsOnState(a) && same(a, b);
  };

  // What's known about each pair of schemas excluding each other, like
  // `known`, in either order
  const knownToExclude = pairs();

  // How many comparisons deep this one is, so expressions that apply each
  // other through `not` aren't compared forever
  let depth = 0;

  /** @type (a: Expression, b: Expression) => boolean */
  const expressionExcludes = (a, b) => {
    if (depth >= maxDepth) {
      return false;
    }

    const pair = a.op === "apply" && b.op === "apply" ? [a.schema, b.schema].sort() : undefined;
    let result = pair === undefined ? undefined : knownToExclude.get(pair[0], pair[1]);
    if (result === undefined) {
      if (pair !== undefined) {
        knownToExclude.set(pair[0], pair[1], false);
      }
      depth++;
      const aSide = conjuncts(a, noSchemas);
      const bSide = conjuncts(b, noSchemas);
      result = jsonTypes.every((type) => excludeFor(type, aSide, bSide));
      depth--;
      if (pair !== undefined) {
        knownToExclude.set(pair[0], pair[1], result);
      }
    }
    return result;
  };

  /**
   * Everything that has to pass for an expression to: what's in its `all`s
   * and the groups of the schemas it applies, each schema once, with the
   * schemas it applied. A schema that isn't known is left out, which only
   * makes less known. `propertyEquals` is the two things it says.
   *
   * `within` is the schemas whose groups the expression is already in: it's
   * in an `any` or `one` of theirs. They're left out too, so a schema that
   * applies itself in an `any` or `one` isn't looked into forever.
   *
   * @type (expression: Expression, within: ReadonlySet<Handle>) => Side
   */
  const conjuncts = (expression, within) => {
    /** @type Expression[] */
    const parts = [];
    const applied = new Set(within);

    /** @type (expression: Expression) => void */
    const add = (expression) => {
      if (expression.op === "all") {
        expression.of.forEach(add);
      } else if (expression.op === "inline") {
        expression.keywords.forEach((group) => add(group.expression));
      } else if (expression.op === "apply") {
        if (!applied.has(expression.schema)) {
          applied.add(expression.schema);
          schemas.get(expression.schema)?.forEach(add);
        }
      } else if (expression.op === "propertyEquals") {
        parts.push({ op: "hasProperty", name: expression.name });
        parts.push({ op: "property", name: expression.name, of: { op: "equals", value: expression.value } });
      } else if (!alwaysPasses(expression)) {
        parts.push(expression);
      }
    };
    add(expression);

    return { parts, applied };
  };

  /**
   * Whether no instance of a type passes everything on both sides
   *
   * @type (type: JsonTypeName, a: Side, b: Side) => boolean
   */
  const excludeFor = (type, a, b) => {
    if (!canPassType(type, a) || !canPassType(type, b)) {
      return true;
    }

    // Two operations that no instance of the type passes, on either side
    const both = [...a.parts, ...b.parts];
    if (both.some((x) => both.some((y) => operationsExclude(type, x, y)))) {
      return true;
    }

    for (const [side, others] of [[a, b], [b, a]]) {
      /** @type Expression */
      const ofType = { op: "all", of: [{ op: "typeIs", types: [type] }, ...others.parts] };
      for (const part of side.parts) {
        if (part.op === "not" && expressionImplies(ofType, part.of)) {
          return true;
        } else if ((part.op === "any" || part.op === "one") && part.of.every((of) => excludeFor(type, conjuncts(of, side.applied), others))) {
          return true;
        }
      }
    }

    // A property both sides say something about, which an object has to have
    if (type === "object") {
      for (const x of a.parts) {
        for (const y of b.parts) {
          if (x.op === "property" && y.op === "property" && x.name === y.name
            && both.some((part) => part.op === "hasProperty" && part.name === x.name) && expressionExcludes(x.of, y.of)) {
            return true;
          }
        }
      }
    }

    return false;
  };

  /**
   * Whether an instance of a type could pass everything that has to pass
   *
   * @type (type: JsonTypeName, side: Side) => boolean
   */
  const canPassType = (type, { parts, applied }) => parts.every((part) => {
    switch (part.op) {
      case "fail":
        return false;
      case "typeIs":
        return part.types.includes(type) || (type === "number" && part.types.includes("integer"));
      case "equals":
        return typeOf(part.value) === type;
      case "oneOfValues":
        return part.values.some((value) => typeOf(value) === type);
      case "any":
      case "one":
        return part.of.some((of) => canPassType(type, conjuncts(of, applied)));
      default:
        return true;
    }
  });

  /**
   * An expression's keys in each way of telling expressions apart, by the
   * way's name. Two expressions with keys in the same way and none in
   * common exclude each other, or with `forObjects`, no object passes
   * both.
   *
   * @type (expression: Expression, forObjects: boolean) => Map<string, Set<string>>
   */
  const keysOf = (expression, forObjects) => {
    /** @type Map<string, Set<string>> */
    const keys = new Map();
    const side = conjuncts(expression, noSchemas);
    const types = jsonTypes.filter((type) => canPassType(type, side));
    if (types.length === 0) {
      return keys;
    } else if (types.length < jsonTypes.length) {
      keys.set("type", new Set(types));
    }

    // Two expressions that are ruled out exclude each other whatever else
    // they say. For which one implies another, an expression nothing passes
    // implies everything, and `implies` can know it from one part: an `any`
    // or `one` whose expressions all say the same, or a value. So there,
    // one with a part like that next to what its keys are from has no keys.
    const hasChoice = forObjects && side.parts.some(isChoice);
    const hasValues = side.parts.some(({ op }) => op === "equals" || op === "oneOfValues");

    const values = valuesIn(side.parts);
    if (values !== undefined && !hasChoice) {
      keys.set("values", values);
    }

    // A property's values only say something about objects
    const forProperties = forObjects ? types.includes("object") && !hasChoice && !hasValues : types.length === 1 && types[0] === "object";
    for (const part of forProperties ? side.parts : []) {
      if (part.op !== "hasProperty" || keys.has(`property ${part.name}`)) {
        continue;
      }

      const ofProperty = side.parts.flatMap((other) => other.op === "property" && other.name === part.name ? conjuncts(other.of, noSchemas).parts : []);
      const propertyValues = valuesIn(ofProperty);
      if (propertyValues !== undefined && !(forObjects && ofProperty.some(isChoice))) {
        keys.set(`property ${part.name}`, propertyValues);
      }
    }

    // What's required only says which objects pass, and whether one
    // expression implies another, not whether they exclude each other
    if (forObjects && forProperties) {
      const required = new Set(side.parts.flatMap((part) => part.op === "hasProperty" ? [part.name] : []));
      if (required.size > 0) {
        keys.set(requiredWay, required);
      }
    }

    return keys;
  };

  /** @type (forObjects: boolean) => Relations["overlapping"] */
  const ruledOutBy = (forObjects) => (expressions) => {
    const keys = expressions.map((expression) => keysOf(expression, forObjects));
    const count = expressions.length;

    // The way that leaves the fewest pairs to compare
    /** @type {{ way: Way; pairs: number } | undefined} */
    let best;
    for (const name of new Set(keys.flatMap((each) => [...each.keys()]))) {
      const ofWay = keys.map((each) => each.get(name));
      const withKey = bucketsOf(ofWay);

      // What each one is found by: any of its keys, or of the properties
      // it requires, the one the fewest require
      let finders = ofWay;
      let foundBy = withKey;
      if (name === requiredWay) {
        finders = ofWay.map((each) => {
          if (each !== undefined) {
            const [rarest] = [...each].sort((a, b) => /** @type number[] */ (withKey.get(a)).length - /** @type number[] */ (withKey.get(b)).length);
            return new Set([rarest]);
          }
        });
        foundBy = bucketsOf(finders);
      }
      const unkeyed = ofWay.flatMap((each, index) => each === undefined ? [index] : []);
      /** @type Way */
      const way = { ofWay, finders, withKey, foundBy, unkeyed };

      // About how many it leaves, without listing them
      let pairs = unkeyed.length * count;
      for (const [index, each] of ofWay.entries()) {
        for (const key of each ?? []) {
          pairs += /** @type number[] */ (foundBy.get(key) ?? []).length;
        }
        if (each !== undefined) {
          pairs += unkeyed.length;
          for (const key of finders === ofWay ? [] : finders[index] ?? []) {
            pairs += /** @type number[] */ (withKey.get(key)).length;
          }
        }
      }
      if (best === undefined || pairs < best.pairs) {
        best = { way, pairs };
      }
    }

    const way = best?.way ?? { ofWay: [], finders: [], withKey: new Map(), foundBy: new Map(), unkeyed: [] };
    return (index) => othersIn(way, index, count);
  };

  return { implies: expressionImplies, excludes: expressionExcludes, overlapping: ruledOutBy(false), comparable: ruledOutBy(true) };
};

/** @type (expression: Expression) => boolean */
const isChoice = ({ op }) => op === "any" || op === "one";

/** The kind of key that's the properties an expression requires */
const requiredWay = "required";

/**
 * One kind of key for a list of expressions: each one's keys (`ofWay`),
 * or undefined for one without any, which are the `unkeyed`, the keys
 * each is found by (`finders`), and which have each key (`withKey`) and
 * are found by it (`foundBy`)
 *
 * @typedef {{
 *   ofWay: (Set<string> | undefined)[];
 *   finders: (Set<string> | undefined)[];
 *   withKey: Map<string, number[]>;
 *   foundBy: Map<string, number[]>;
 *   unkeyed: number[];
 * }} Way
 */

/**
 * The indexes that have each key
 *
 * @type (keys: (Set<string> | undefined)[]) => Map<string, number[]>
 */
const bucketsOf = (keys) => {
  /** @type Map<string, number[]> */
  const buckets = new Map();
  for (const [index, each] of keys.entries()) {
    for (const key of each ?? []) {
      const bucket = buckets.get(key);
      if (bucket === undefined) {
        buckets.set(key, [index]);
      } else {
        bucket.push(index);
      }
    }
  }
  return buckets;
};

/**
 * The others a kind of key doesn't rule out for one of `count`
 * expressions, in order: every other one if it has no key, or else the
 * ones without a key, the ones found by one of its keys, and the ones
 * with a key it's found by
 *
 * @type (way: Way, index: number, count: number) => number[]
 */
const othersIn = ({ ofWay, finders, withKey, foundBy, unkeyed }, index, count) => {
  const keys = ofWay[index];
  if (keys === undefined) {
    return Array.from({ length: count }, (_, other) => other).filter((other) => other !== index);
  }

  const others = new Set(unkeyed);
  for (const key of keys) {
    for (const other of foundBy.get(key) ?? []) {
      others.add(other);
    }
  }
  if (finders !== ofWay) {
    for (const key of finders[index] ?? []) {
      for (const other of withKey.get(key) ?? []) {
        others.add(other);
      }
    }
  }
  others.delete(index);
  return [...others].sort((a, b) => a - b);
};

/**
 * The values some expressions that all have to pass allow, if any of them
 * says (`equals`, `oneOfValues`), each as a string that's the same for
 * values that are equal: the ones every one that says allows. It's
 * undefined if none says, or if they allow none, so nothing passes.
 *
 * @type (parts: Expression[]) => Set<string> | undefined
 */
const valuesIn = (parts) => {
  /** @type Set<string> | undefined */
  let values;
  for (const part of parts) {
    if (part.op === "equals" || part.op === "oneOfValues") {
      const allowed = new Set((part.op === "equals" ? [part.value] : part.values).map(canonical));
      values = values === undefined ? allowed : values.intersection(allowed);
    }
  }
  return values?.size === 0 ? undefined : values;
};

/**
 * A value as JSON with each object's properties in order, so values that
 * are equal are the same string
 *
 * @type (value: Json) => string
 */
const canonical = (value) => {
  if (Array.isArray(value)) {
    return `[${value.map(canonical).join(",")}]`;
  } else if (typeof value === "object" && value !== null) {
    const properties = Object.keys(value).sort();
    return `{${properties.map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
};

/**
 * One side of `excludes`: everything that has to pass, and the schemas
 * whose groups those are
 *
 * @typedef {{ parts: Expression[]; applied: ReadonlySet<Handle> }} Side
 */

/** @type ReadonlySet<Handle> */
const noSchemas = new Set();

/**
 * What's known about pairs of schemas. It's a map for each first schema,
 * because a key made of both handles costs more than the comparison for
 * the thousands of pairs in a long `anyOf`.
 *
 * @type () => { get: (a: Handle, b: Handle) => boolean | undefined; set: (a: Handle, b: Handle, value: boolean) => void }
 */
const pairs = () => {
  /** @type Map<Handle, Map<Handle, boolean>> */
  const known = new Map();
  return {
    get: (a, b) => known.get(a)?.get(b),
    set: (a, b, value) => {
      let ofA = known.get(a);
      if (ofA === undefined) {
        ofA = new Map();
        known.set(a, ofA);
      }
      ofA.set(b, value);
    }
  };
};

/** How deep `excludes` and `implies` follow each other through `not` */
const maxDepth = 16;

/** @type JsonTypeName[] */
const jsonTypes = ["null", "boolean", "number", "string", "array", "object"];

/**
 * Whether no instance of a type passes two operations: every value of the
 * type that one allows fails the other, or their limits don't overlap
 *
 * @type (type: JsonTypeName, x: Expression, y: Expression) => boolean
 */
const operationsExclude = (type, x, y) => {
  if (x.op === "equals" || x.op === "oneOfValues") {
    const values = (x.op === "equals" ? [x.value] : x.values).filter((value) => typeOf(value) === type);
    return values.length > 0 && values.every((value) => valuePasses(value, y) === false);
  } else if (x.op === "range" && y.op === "range" && type === "number") {
    return x.min !== undefined && y.max !== undefined
      && (x.min > y.max || (x.min === y.max && (x.exclusiveMin === true || y.exclusiveMax === true)));
  } else if ((x.op === "stringLength" || x.op === "itemCount" || x.op === "propertyCount") && y.op === x.op && domains[x.op] === type) {
    return x.min !== undefined && y.max !== undefined && x.min > y.max;
  }
  return false;
};

/**
 * Whether an operation passes every instance: `pass`, and what only
 * annotates
 *
 * @type (expression: Expression) => boolean
 */
const alwaysPasses = (expression) => {
  return expression.op === "pass" || expression.op === "annotate" || (expression.op === "format" && !expression.assert);
};

/**
 * Whether a `typeIs`'s types allow a type: they have it, or it's `integer`
 * and they have `number`
 *
 * @type (types: TypeName[], type: TypeName) => boolean
 */
const allowsType = (types, type) => types.includes(type) || (type === "integer" && types.includes("number"));

/**
 * @param {Expression} expression
 * @returns {expression is ExpressionOf<"range" | "stringLength" | "itemCount" | "propertyCount">}
 */
const hasBothLimits = (expression) => {
  return (expression.op === "range" || expression.op === "stringLength" || expression.op === "itemCount" || expression.op === "propertyCount")
    && expression.min !== undefined && expression.max !== undefined;
};

/** @type (expression: ExpressionOf<"range" | "stringLength" | "itemCount" | "propertyCount">, limit: "min" | "max") => Expression */
const withoutLimit = (expression, limit) => {
  /** @type Record<string, unknown> */
  const result = { ...expression };
  delete result[limit];
  delete result[limit === "min" ? "exclusiveMin" : "exclusiveMax"];
  return /** @type Expression */ (result);
};

/**
 * Whether a `range`'s limits are at least as tight as another's
 *
 * @type (a: ExpressionOf<"range">, b: ExpressionOf<"range">) => boolean
 */
const rangeImplies = (a, b) => {
  /** @type (aLimit: number | undefined, aExclusive: boolean | undefined, bLimit: number | undefined, bExclusive: boolean | undefined, direction: 1 | -1) => boolean */
  const tighter = (aLimit, aExclusive, bLimit, bExclusive, direction) => {
    if (bLimit === undefined) {
      return true;
    } else if (aLimit === undefined) {
      return false;
    }
    return aLimit * direction > bLimit * direction || (aLimit === bLimit && (aExclusive === true || bExclusive !== true));
  };

  return tighter(a.min, a.exclusiveMin, b.min, b.exclusiveMin, 1) && tighter(a.max, a.exclusiveMax, b.max, b.exclusiveMax, -1);
};

/**
 * Whether a count's limits are at least as tight as another's
 *
 * @type (a: Limits, b: Limits) => boolean
 */
const limitsImply = (a, b) => {
  return (b.min === undefined || (a.min !== undefined && a.min >= b.min))
    && (b.max === undefined || (a.max !== undefined && a.max <= b.max));
};

/**
 * Whether a value passes an expression, for the operations that can be
 * checked without a schema. It's undefined for the others.
 *
 * @type (value: Json, expression: Expression) => boolean | undefined
 */
const valuePasses = (value, expression) => {
  const type = typeOf(value);
  const domain = domains[expression.op];
  if (domain !== undefined && domain !== type) {
    return true;
  }

  switch (expression.op) {
    case "typeIs":
      return expression.types.includes(type) || (expression.types.includes("integer") && Number.isInteger(value));
    case "equals":
      return equal(value, expression.value);
    case "oneOfValues":
      return expression.values.some((each) => equal(value, each));
    case "not": {
      const result = valuePasses(value, expression.of);
      return result === undefined ? undefined : !result;
    }
    case "range": {
      const number = /** @type number */ (value);
      const { min, max } = expression;
      return (min === undefined || (expression.exclusiveMin ? number > min : number >= min))
        && (max === undefined || (expression.exclusiveMax ? number < max : number <= max));
    }
    case "stringLength":
      return isWithin(codePointLength(/** @type string */ (value)), expression);
    case "itemCount":
      return isWithin(/** @type Json[] */ (value).length, expression);
    case "propertyCount":
      return isWithin(Object.keys(/** @type Record<string, Json> */ (value)).length, expression);
    case "hasProperty":
      return Object.hasOwn(/** @type Record<string, Json> */ (value), expression.name);
    case "propertyEquals": {
      const object = /** @type Record<string, Json> */ (value);
      return Object.hasOwn(object, expression.name) && equal(object[expression.name], expression.value);
    }
  }
};

/** @type (count: number, limits: Limits) => boolean */
const isWithin = (count, { min, max }) => (min === undefined || count >= min) && (max === undefined || count <= max);

/** @type (a: Json, b: Json) => boolean */
const equal = (a, b) => instanceEqual(jsInstance, a, jsInstance, b, false);

/** @type (value: Json) => JsonTypeName */
const typeOf = (value) => {
  if (value === null) {
    return "null";
  } else if (Array.isArray(value)) {
    return "array";
  }
  return /** @type JsonTypeName */ (typeof value);
};

/**
 * Whether an expression's result depends on more than the instance: on
 * what's marked (an `unevaluated` selector), on the dynamic scope, or on
 * an `opaque` operation, which nothing is known about
 *
 * @type (expression: Expression) => boolean
 */
const dependsOnState = (expression) => {
  switch (expression.op) {
    case "opaque":
    case "dynamicApply":
      return true;
    case "eachProperty":
      return "unevaluated" in expression.select || dependsOnState(expression.of);
    case "eachItem":
      return "unevaluated" in expression || dependsOnState(expression.of);
    default:
      return subexpressions(expression).some(dependsOnState);
  }
};

/**
 * Whether two expressions, or two of their fields, are written the same,
 * with an object's properties in any order
 *
 * @type (a: unknown, b: unknown) => boolean
 */
const same = (a, b) => {
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, index) => same(item, b[index]));
  } else if (isObject(a) && isObject(b)) {
    const keys = Object.keys(a);
    return keys.length === Object.keys(b).length && keys.every((key) => key in b && same(a[key], b[key]));
  }
  return a === b;
};

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
const isObject = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
