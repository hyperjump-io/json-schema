import { jsInstance } from "./instance.js";
import { codePointLength, instanceEqual } from "../keywords/utilities.js";
import { readsDynamicScope, readsMarks } from "./kernel.js";

/**
 * @import { Json } from "@hyperjump/browser/json"
 * @import { JsonSchema } from "../json-schema.d.ts"
 * @import { EvaluateContext, Keyword } from "../keyword.d.ts"
 * @import { CompiledSchema, Expression, Handle, ItemPattern, Kernel, Selector, TypeName } from "./kernel.d.ts"
 */

/**
 * The marks an evaluator makes, or undefined if nothing reads them
 *
 * @typedef {Set<string | number> | undefined} Marks
 */

/**
 * @typedef {(instance: Json, marks: Marks) => boolean} Evaluator
 */

/**
 * @typedef {Record<string, Json>} JsonObject
 */

/** @type (instance: Json) => instance is JsonObject */
const isObject = (instance) => typeof instance === "object" && instance !== null && !Array.isArray(instance);

/** @type (a: Json, b: Json) => boolean */
const equal = (a, b) => instanceEqual(jsInstance, a, jsInstance, b, true);

/** @type (marks: Marks, more: Set<string | number>) => void */
const addAll = (marks, more) => {
  if (marks !== undefined) {
    for (const key of more) {
      marks.add(key);
    }
  }
};

/**
 * Whether an expression does nothing without annotations or plugins
 *
 * @type (expression: Expression) => boolean
 */
const isInert = (expression) => expression.op === "pass" || expression.op === "annotate";

/**
 * Evaluation of plain values without plugins (FLAG). It's written for plain
 * values, which is faster than evaluating through instance operations.
 *
 * Marks are demand-driven. An evaluator gets the set to mark in, or
 * `undefined` if nothing reads what it marks. A schema with a group that
 * reads marks starts its own set, and adds it to its caller's if it
 * passes. An operation whose subexpressions can fail without it failing
 * (`any`, `one`, a condition of `cases`) gives each subexpression its own
 * set and keeps the ones that pass. Without a set, `any` stops at the first
 * that passes, and `contains` at its minimum.
 *
 * A schema's property operations are merged into one loop over the
 * properties. That's what makes real schemas faster than evaluating each
 * operation on its own.
 *
 * @type (jsonSchema: JsonSchema, kernel: Kernel) => (instance: Json) => boolean
 */
export const fast = (jsonSchema, kernel) => {
  const tracksDynamicScope = Object.values(kernel.schemas).some((schema) => {
    return typeof schema !== "boolean" && schema.keywords.some(({ expression }) => readsDynamicScope(expression));
  });

  // An `opaque` operation can't stop early if it might get marks
  const marksAreRead = Object.values(kernel.schemas).some((schema) => {
    return typeof schema !== "boolean" && schema.keywords.some(({ expression }) => readsMarks(expression));
  });

  /** @type string | undefined */
  let currentResource;
  /** @type Record<string, Handle> | undefined */
  let dynamicAnchors;

  /** @type Map<Handle, Evaluator> */
  const evaluators = new Map();

  /** @type (handle: Handle) => Evaluator */
  const schema = (handle) => {
    let evaluator = evaluators.get(handle);
    if (evaluator === undefined) {
      if (!(handle in kernel.schemas)) {
        throw Error(`The '${handle}' schema wasn't compiled`);
      }

      // Schemas can refer to themselves, so it's built after it's cached
      /** @type Evaluator | undefined */
      let built;
      evaluator = (instance, marks) => /** @type Evaluator */ (built)(instance, marks);
      evaluators.set(handle, evaluator);
      built = buildSchema(kernel.schemas[handle]);
      evaluators.set(handle, built);
      evaluator = built;
    }

    return evaluator;
  };

  /** @type (compiled: CompiledSchema) => Evaluator */
  const buildSchema = (compiled) => {
    if (typeof compiled === "boolean") {
      return () => compiled;
    }

    const expressions = compiled.keywords.map(({ expression }) => expression).filter((expression) => !isInert(expression));
    const groups = mergeProperties(expressions);

    let evaluator = every(groups);

    if (expressions.some(readsMarks)) {
      const body = evaluator;
      evaluator = (instance, marks) => {
        /** @type Set<string | number> */
        const own = new Set();
        if (!body(instance, own)) {
          return false;
        }
        addAll(marks, own);
        return true;
      };
    }

    if (tracksDynamicScope) {
      const body = evaluator;
      const { resource } = compiled;
      const resourceAnchors = kernel.resources[resource].dynamicAnchors;
      evaluator = (instance, marks) => {
        if (resource === currentResource) {
          return body(instance, marks);
        }

        const outerResource = currentResource;
        const outerAnchors = dynamicAnchors;
        currentResource = resource;
        dynamicAnchors = addDynamicAnchors(resourceAnchors, dynamicAnchors);
        const valid = body(instance, marks);
        currentResource = outerResource;
        dynamicAnchors = outerAnchors;
        return valid;
      };
    }

    return evaluator;
  };

  /**
   * A subexpression on a child. Marks on a child are the child's, so it gets
   * its own set if it reads them, and callers pass `undefined`.
   *
   * @type (of: Expression) => Evaluator
   */
  const child = (of) => {
    const evaluate = build(of);
    return readsMarks(of) ? (instance) => evaluate(instance, new Set()) : evaluate;
  };

  /** @type (expression: Expression) => Evaluator */
  const build = (expression) => {
    switch (expression.op) {
      case "pass":
      case "annotate":
        return () => true;
      case "fail":
        return () => false;
      case "all":
        return every(expression.of.map(build));
      case "any": {
        const of = expression.of.map(build);
        return (instance, marks) => {
          if (marks === undefined) {
            for (let index = 0; index < of.length; index++) {
              if (of[index](instance, undefined)) {
                return true;
              }
            }
            return false;
          }

          let valid = false;
          for (let index = 0; index < of.length; index++) {
            /** @type Set<string | number> */
            const own = new Set();
            if (of[index](instance, own)) {
              valid = true;
              addAll(marks, own);
            }
          }
          return valid;
        };
      }
      case "one": {
        const of = expression.of.map(build);
        return (instance, marks) => {
          /** @type Set<string | number> | undefined */
          let passed;
          let count = 0;
          for (let index = 0; index < of.length; index++) {
            const own = marks && new Set();
            if (of[index](instance, own)) {
              if (++count > 1) {
                return false;
              }
              passed = own;
            }
          }
          if (count === 1 && passed !== undefined) {
            addAll(marks, passed);
          }
          return count === 1;
        };
      }
      case "not": {
        const of = build(expression.of);
        return (instance) => !of(instance, undefined);
      }
      case "cases": {
        const byType = casesByType(expression);
        if (byType !== undefined) {
          return (instance, marks) => byType[typeIndex(instance)](instance, marks);
        }

        const cases = expression.cases.map(([condition, then]) => /** @type const */ ([build(condition), then && build(then)]));
        const otherwise = expression.otherwise && build(expression.otherwise);
        return (instance, marks) => {
          for (let index = 0; index < cases.length; index++) {
            const [condition, then] = cases[index];
            const own = marks && new Set();
            if (condition(instance, own)) {
              if (own !== undefined) {
                addAll(marks, own);
              }
              return then === null || then(instance, marks);
            }
          }
          return otherwise === null || otherwise(instance, marks);
        };
      }
      case "apply":
        return schema(expression.schema);
      case "dynamicApply": {
        const { anchor, fallback } = expression;
        const fallbackEvaluator = fallback === null ? undefined : schema(fallback);
        return (instance, marks) => {
          const handle = dynamicAnchors?.[anchor];
          const evaluate = handle === undefined ? fallbackEvaluator : schema(handle);
          if (evaluate === undefined) {
            throw Error(`No '${anchor}' dynamic anchor is in the dynamic scope`);
          }
          return evaluate(instance, marks);
        };
      }

      case "typeIs": {
        /** @type Set<string> */
        const types = new Set(expression.types);
        const integer = types.has("integer");

        // Most schemas have one type, which is checked without a lookup
        if (types.size === 1 && !integer) {
          const [only] = types;
          if (only === "object") {
            return (instance) => isObject(instance);
          } else if (only === "array") {
            return (instance) => Array.isArray(instance);
          } else if (only === "null") {
            return (instance) => instance === null;
          }
          return (instance) => typeof instance === only;
        }

        // A bit for each type in `typeIndexes`
        let mask = 0;
        for (const [index, type] of typeIndexes.entries()) {
          if (types.has(type)) {
            mask |= 1 << index;
          }
        }
        if (!integer || types.has("number")) {
          return (instance) => (mask & (1 << typeIndex(instance))) !== 0;
        }
        return (instance) => (mask & (1 << typeIndex(instance))) !== 0 || Number.isInteger(instance);
      }
      case "equals": {
        const { value } = expression;
        return (instance) => equal(instance, value);
      }
      case "oneOfValues": {
        // Primitives are compared with a lookup. Only arrays and objects
        // need instanceEqual.
        /** @type Set<Json> */
        const primitives = new Set();
        /** @type Json[] */
        const structured = [];
        for (const value of expression.values) {
          if (typeof value === "object" && value !== null) {
            structured.push(value);
          } else {
            primitives.add(value);
          }
        }
        return (instance) => typeof instance === "object" && instance !== null
          ? structured.some((value) => equal(instance, value))
          : primitives.has(instance);
      }

      case "range": {
        const { min = -Infinity, max = Infinity, exclusiveMin = false, exclusiveMax = false } = expression;
        return (instance) => typeof instance !== "number"
          || ((exclusiveMin ? instance > min : instance >= min) && (exclusiveMax ? instance < max : instance <= max));
      }
      case "multipleOf": {
        const { divisor } = expression;
        return (instance) => {
          if (typeof instance !== "number") {
            return true;
          }
          const remainder = instance % divisor;
          return isClose(remainder, 0) || isClose(remainder, divisor);
        };
      }

      case "stringLength": {
        const { min = 0, max = Infinity } = expression;
        return (instance) => {
          if (typeof instance !== "string") {
            return true;
          }
          const length = codePointLength(instance);
          return length >= min && length <= max;
        };
      }
      case "matches": {
        const regExp = new RegExp(expression.pattern, "u");
        return (instance) => typeof instance !== "string" || regExp.test(instance);
      }
      case "format": {
        if (!expression.assert) {
          return () => true;
        }

        // A value of a type the format doesn't apply to is valid
        const { types, validate } = jsonSchema.getFormat(/** @type string */ (expression.uri));
        return (instance) => {
          const type = /** @type string */ (jsInstance.typeOf(instance));
          return (types !== undefined && !types.includes(/** @type any */ (type))) || validate(instance);
        };
      }

      case "itemCount": {
        const { min = 0, max = Infinity } = expression;
        return (instance) => !Array.isArray(instance) || (instance.length >= min && instance.length <= max);
      }
      case "uniqueItems":
        return (instance) => {
          if (!Array.isArray(instance)) {
            return true;
          }
          for (let i = 1; i < instance.length; i++) {
            for (let j = 0; j < i; j++) {
              if (instanceEqual(jsInstance, instance[j], jsInstance, instance[i], false)) {
                return false;
              }
            }
          }
          return true;
        };
      case "item": {
        const { index } = expression;
        const of = child(expression.of);
        return (instance, marks) => {
          if (!Array.isArray(instance) || index >= instance.length) {
            return true;
          } else if (!of(instance[index], undefined)) {
            return false;
          }
          marks?.add(index);
          return true;
        };
      }
      case "eachItem": {
        const of = child(expression.of);
        const unevaluated = "unevaluated" in expression;
        const from = "from" in expression ? expression.from : 0;
        return (instance, marks) => {
          if (!Array.isArray(instance)) {
            return true;
          }
          for (let index = from; index < instance.length; index++) {
            if (unevaluated && /** @type Set<string | number> */ (marks).has(index)) {
              continue;
            } else if (!of(instance[index], undefined)) {
              return false;
            }
            marks?.add(index);
          }
          return true;
        };
      }
      case "contains": {
        const { min, max } = expression;
        const of = child(expression.of);
        return (instance, marks) => {
          if (!Array.isArray(instance)) {
            return true;
          }
          let matches = 0;
          for (let index = 0; index < instance.length; index++) {
            if (of(instance[index], undefined)) {
              matches++;
              marks?.add(index);
              if (marks === undefined && max === null && matches >= min) {
                return true;
              } else if (max !== null && matches > max) {
                return false;
              }
            }
          }
          return matches >= min && (max === null || matches <= max);
        };
      }
      case "itemSequence":
        return buildItemSequence(expression.pattern);

      case "propertyCount": {
        const { min = 0, max = Infinity } = expression;
        return (instance) => {
          if (!isObject(instance)) {
            return true;
          }
          const count = Object.keys(instance).length;
          return count >= min && count <= max;
        };
      }
      case "hasProperty": {
        const { name } = expression;
        return (instance) => !isObject(instance) || Object.hasOwn(instance, name);
      }
      case "propertyEquals": {
        const { name, value } = expression;
        return (instance) => !isObject(instance) || (Object.hasOwn(instance, name) && equal(instance[name], value));
      }
      case "property": {
        const { name } = expression;
        const of = child(expression.of);
        return (instance, marks) => {
          if (!isObject(instance) || !Object.hasOwn(instance, name)) {
            return true;
          } else if (!of(instance[name], undefined)) {
            return false;
          }
          marks?.add(name);
          return true;
        };
      }
      case "eachProperty": {
        const of = child(expression.of);
        const { select } = expression;
        const unevaluated = "unevaluated" in select;
        const selected = selector(select);
        return (instance, marks) => {
          if (!isObject(instance)) {
            return true;
          }
          for (const name in instance) {
            if (unevaluated ? /** @type Set<string | number> */ (marks).has(name) : !selected(name)) {
              continue;
            } else if (!of(instance[name], undefined)) {
              return false;
            }
            marks?.add(name);
          }
          return true;
        };
      }
      case "eachPropertyName": {
        const of = child(expression.of);
        return (instance) => {
          if (!isObject(instance)) {
            return true;
          }
          for (const name in instance) {
            if (!of(name, undefined)) {
              return false;
            }
          }
          return true;
        };
      }

      case "predicate": {
        const evaluate = keywordEvaluate(jsonSchema, expression.keyword)(expression.value, { op: "predicate", jsonSchema, instance: jsInstance });
        const isOfType = build({ op: "typeIs", types: expression.types });
        return (instance) => !isOfType(instance, undefined) || evaluate(instance);
      }
      case "opaque":
        return buildOpaque(expression);
    }
  };

  /**
   * A `cases` whose conditions are only `typeIs` (what `type-dispatch` makes
   * of `oneOf` with a different `type` in each schema), as the branch for
   * each instance type, so it's one lookup instead of a test for each case.
   * A condition that's `typeIs` marks nothing.
   *
   * @type (expression: Extract<Expression, { op: "cases" }>) => Evaluator[] | undefined
   */
  const casesByType = ({ cases, otherwise }) => {
    /** @type TypeName[][] */
    const types = [];
    for (const [condition] of cases) {
      if (condition.op !== "typeIs" || condition.types.includes("integer")) {
        return undefined;
      }
      types.push(condition.types);
    }

    /** @type Map<Expression | null, Evaluator> */
    const branches = new Map();
    return typeIndexes.map((type) => {
      const index = types.findIndex((caseTypes) => caseTypes.includes(type));
      const then = index === -1 ? otherwise : cases[index][1];
      let evaluator = branches.get(then);
      if (evaluator === undefined) {
        evaluator = then === null ? () => true : build(then);
        branches.set(then, evaluator);
      }
      return evaluator;
    });
  };

  /**
   * An `opaque` operation, through the keyword's evaluator. Its context reads
   * the marks of the evaluation in progress, which are swapped in for each
   * call, so evaluations that nest (a schema that applies itself) each see
   * their own.
   *
   * @type (expression: Extract<Expression, { op: "opaque" }>) => Evaluator
   */
  const buildOpaque = (expression) => {
    /** @type Marks */
    let current;

    /** @type (of: Expression) => (instance: Json, segment?: string | number) => boolean */
    const subschema = (of) => {
      const onInstance = build(of);
      const onChild = child(of);
      return (instance, segment) => {
        // Marks on a child are the child's. On the same instance, they're
        // kept only if the schema passes.
        if (segment !== undefined) {
          return onChild(instance, undefined);
        } else if (current === undefined) {
          return onInstance(instance, undefined);
        }
        /** @type Set<string | number> */
        const own = new Set();
        const valid = onInstance(instance, own);
        if (valid) {
          addAll(current, own);
        }
        return valid;
      };
    };

    /** @type EvaluateContext<Json> */
    const context = {
      op: "opaque",
      jsonSchema,
      instance: jsInstance,
      exhaustive: marksAreRead,
      schemas: expression.schemas.map(subschema),
      markEvaluated: (key) => {
        current?.add(key);
      }
    };
    if (expression.reads?.includes("evaluated")) {
      context.evaluated = () => current ?? new Set();
    }
    if (expression.reads?.includes("dynamicScope")) {
      context.dynamicAnchor = (name) => {
        const handle = dynamicAnchors?.[name];
        return handle === undefined ? undefined : subschema({ op: "apply", schema: handle });
      };
    }

    const evaluate = keywordEvaluate(jsonSchema, expression.keyword)(expression.value, context);
    return (instance, marks) => {
      const outer = current;
      current = marks;
      const valid = evaluate(instance);
      current = outer;
      return valid;
    };
  };

  /**
   * The items, in order, have to match the pattern. It's an NFA built from
   * the pattern's tree.
   *
   * @type (pattern: ItemPattern) => Evaluator
   */
  const buildItemSequence = (pattern) => {
    const { states, start, end } = itemSequenceStates(pattern, child);

    return (instance, marks) => {
      if (!Array.isArray(instance)) {
        return true;
      }

      /** @type Set<number> */
      let current = new Set();
      addReachable(states, start, current);
      for (const item of instance) {
        /** @type Set<number> */
        const next = new Set();
        for (const state of current) {
          const { evaluate } = states[state];
          if (evaluate !== undefined && evaluate(item, undefined)) {
            addReachable(states, /** @type number */ (states[state].next), next);
          }
        }
        current = next;
        if (current.size === 0) {
          return false;
        }
      }

      if (!current.has(end)) {
        return false;
      }
      for (let index = 0; index < instance.length; index++) {
        marks?.add(index);
      }
      return true;
    };
  };

  /**
   * A schema's property operations (`property`, and `eachProperty` with a
   * pattern or an `except`) in its groups' top-level `all`s, merged into one
   * loop over the properties. The rest are evaluated as they are, before
   * the loop. Evaluating them in a different order doesn't change the
   * result, and only operations that read marks, which aren't merged, can
   * see what's marked.
   *
   * @type (expressions: Expression[]) => Evaluator[]
   */
  const mergeProperties = (expressions) => {
    /** @type Map<string, Expression[]> */
    const named = new Map();
    /** @type [string, Expression][] */
    const patterns = [];
    /** @type [{ except: { names: string[]; patterns: string[] } }, Expression][] */
    const excepts = [];
    /** @type Expression[] */
    const rest = [];
    /** @type Expression[] */
    const readingMarks = [];

    for (const expression of expressions) {
      if (readsMarks(expression)) {
        readingMarks.push(expression);
        continue;
      }

      for (const operation of expression.op === "all" ? expression.of : [expression]) {
        if (operation.op === "property") {
          named.set(operation.name, [...named.get(operation.name) ?? [], operation.of]);
        } else if (operation.op === "eachProperty" && "pattern" in operation.select) {
          patterns.push([operation.select.pattern, operation.of]);
        } else if (operation.op === "eachProperty" && "except" in operation.select) {
          excepts.push([operation.select, operation.of]);
        } else {
          rest.push(operation);
        }
      }
    }

    if (named.size + patterns.length + excepts.length < 2) {
      return expressions.map(build);
    }

    return [...rest.map(build), propertyLoop(named, patterns, excepts), ...readingMarks.map(build)];
  };

  /**
   * @type (
   *   namedExpressions: Map<string, Expression[]>,
   *   patternExpressions: [string, Expression][],
   *   exceptExpressions: [{ except: { names: string[]; patterns: string[] } }, Expression][]
   * ) => Evaluator
   */
  const propertyLoop = (namedExpressions, patternExpressions, exceptExpressions) => {
    /** @type Map<string, Evaluator> */
    const named = new Map();
    for (const [name, of] of namedExpressions) {
      named.set(name, child(of.length === 1 ? of[0] : { op: "all", of }));
    }
    const patterns = patternExpressions.map(([pattern, of]) => /** @type const */ ([new RegExp(pattern, "u"), child(of)]));

    // An `except` that's exactly the names and patterns in the loop (usually
    // `additionalProperties` next to its `properties` and
    // `patternProperties`) selects what nothing else did, without testing
    // them again
    /** @type (select: { except: { names: string[]; patterns: string[] } }) => boolean */
    const isOwn = ({ except }) => {
      return except.names.length === namedExpressions.size && except.names.every((name) => namedExpressions.has(name))
        && except.patterns.length === patternExpressions.length && except.patterns.every((pattern, index) => pattern === patternExpressions[index][0]);
    };
    const unmatched = exceptExpressions.filter(([select]) => isOwn(select)).map(([, of]) => child(of));
    const others = exceptExpressions.filter(([select]) => !isOwn(select)).map(([select, of]) => /** @type const */ ([selector(select), child(of)]));

    if (patterns.length === 0 && unmatched.length === 0 && others.length === 0) {
      return (instance, marks) => {
        if (!isObject(instance)) {
          return true;
        }
        for (const name in instance) {
          const of = named.get(name);
          if (of !== undefined) {
            if (!of(instance[name], undefined)) {
              return false;
            }
            marks?.add(name);
          }
        }
        return true;
      };
    }

    return (instance, marks) => {
      if (!isObject(instance)) {
        return true;
      }
      for (const name in instance) {
        const value = instance[name];
        let matched = false;
        const of = named.get(name);
        if (of !== undefined) {
          if (!of(value, undefined)) {
            return false;
          }
          matched = true;
        }
        for (let index = 0; index < patterns.length; index++) {
          if (patterns[index][0].test(name)) {
            if (!patterns[index][1](value, undefined)) {
              return false;
            }
            matched = true;
          }
        }
        let evaluated = matched;
        if (!matched) {
          for (let index = 0; index < unmatched.length; index++) {
            if (!unmatched[index](value, undefined)) {
              return false;
            }
            evaluated = true;
          }
        }
        for (let index = 0; index < others.length; index++) {
          if (others[index][0](name)) {
            if (!others[index][1](value, undefined)) {
              return false;
            }
            evaluated = true;
          }
        }
        if (evaluated) {
          marks?.add(name);
        }
      }
      return true;
    };
  };

  const root = schema(kernel.uri);
  return (instance) => {
    // A plugin or keyword can start another evaluation while one is in
    // progress, so the outer one's dynamic scope is restored after
    const outerResource = currentResource;
    const outerAnchors = dynamicAnchors;
    currentResource = undefined;
    dynamicAnchors = undefined;
    try {
      return root(instance, undefined);
    } finally {
      currentResource = outerResource;
      dynamicAnchors = outerAnchors;
    }
  };
};

/**
 * The `evaluate` of the keyword an escape hatch is for
 *
 * @type (jsonSchema: JsonSchema, uri: string) => NonNullable<Keyword["evaluate"]>
 */
export const keywordEvaluate = (jsonSchema, uri) => {
  const { evaluate } = jsonSchema.getKeyword(uri);
  if (evaluate === undefined) {
    throw Error(`The '${uri}' keyword lowers to an escape hatch, so it needs 'evaluate'`);
  }

  return evaluate;
};

/** @type TypeName[] */
const typeIndexes = ["null", "boolean", "number", "string", "array", "object"];

/** @type (instance: Json) => number */
const typeIndex = (instance) => {
  switch (typeof instance) {
    case "boolean":
      return 1;
    case "number":
      return 2;
    case "string":
      return 3;
    default:
      return instance === null ? 0 : Array.isArray(instance) ? 4 : 5;
  }
};

/**
 * Passes when every one passes. Two or three are called directly, without a
 * loop, which was faster: most schemas have that many keyword groups.
 *
 * @type (of: Evaluator[]) => Evaluator
 */
const every = (of) => {
  if (of.length === 0) {
    return () => true;
  } else if (of.length === 1) {
    return of[0];
  } else if (of.length === 2) {
    const [a, b] = of;
    return (instance, marks) => a(instance, marks) && b(instance, marks);
  } else if (of.length === 3) {
    const [a, b, c] = of;
    return (instance, marks) => a(instance, marks) && b(instance, marks) && c(instance, marks);
  }

  return (instance, marks) => {
    for (let index = 0; index < of.length; index++) {
      if (!of[index](instance, marks)) {
        return false;
      }
    }
    return true;
  };
};

/** @type (a: number, b: number) => boolean */
export const isClose = (a, b) => Math.abs(a - b) < 1.19209290e-7;

/**
 * Add a resource's dynamic anchors to the dynamic scope. The outermost
 * schema with an anchor wins, so anchors that are already in scope aren't
 * replaced. The outer scope is reused if the resource doesn't add anything.
 *
 * @type (resourceAnchors: Record<string, Handle>, dynamicAnchors: Record<string, Handle> | undefined) => Record<string, Handle>
 */
export const addDynamicAnchors = (resourceAnchors, dynamicAnchors) => {
  if (dynamicAnchors === undefined) {
    return resourceAnchors;
  }

  for (const name in resourceAnchors) {
    if (!Object.hasOwn(dynamicAnchors, name)) {
      return { ...resourceAnchors, ...dynamicAnchors };
    }
  }

  return dynamicAnchors;
};

/** @type (select: Selector) => (name: string) => boolean */
export const selector = (select) => {
  if ("pattern" in select) {
    const regExp = new RegExp(select.pattern, "u");
    return (name) => regExp.test(name);
  } else if ("except" in select) {
    const names = new Set(select.except.names);
    const regExps = select.except.patterns.map((pattern) => new RegExp(pattern, "u"));
    return (name) => !names.has(name) && !regExps.some((regExp) => regExp.test(name));
  }

  return () => true;
};

/**
 * A state of the NFA an item pattern is evaluated with. A state either moves
 * to `next` for an item that passes `evaluate`, or moves to its `epsilon`
 * states without consuming an item.
 *
 * @template E
 * @typedef {{ epsilon: number[]; evaluate?: E; next?: number }} State
 */

/**
 * The NFA for an item pattern, with an evaluator for each item expression
 *
 * @type <E>(pattern: ItemPattern, evaluator: (of: Expression) => E) => { states: State<E>[]; start: number; end: number }
 */
export const itemSequenceStates = (pattern, evaluator) => {
  /** @typedef {ReturnType<typeof evaluator>} E */

  /** @type State<E>[] */
  const states = [];
  const addState = () => states.push({ epsilon: [] }) - 1;

  /** @type (pattern: ItemPattern) => { start: number; end: number } */
  const fragment = (pattern) => {
    if ("item" in pattern) {
      const start = addState();
      const end = addState();
      states[start].evaluate = evaluator(pattern.item);
      states[start].next = end;
      return { start, end };
    } else if ("sequence" in pattern) {
      // An empty sequence matches no items
      if (pattern.sequence.length === 0) {
        const start = addState();
        const end = addState();
        states[start].epsilon.push(end);
        return { start, end };
      }

      const parts = pattern.sequence.map(fragment);
      for (let index = 1; index < parts.length; index++) {
        states[parts[index - 1].end].epsilon.push(parts[index].start);
      }
      return { start: parts[0].start, end: /** @type {{ end: number }} */ (parts.at(-1)).end };
    } else if ("either" in pattern) {
      const parts = pattern.either.map(fragment);
      const start = addState();
      const end = addState();
      for (const part of parts) {
        states[start].epsilon.push(part.start);
        states[part.end].epsilon.push(end);
      }
      return { start, end };
    }

    const inner = fragment(pattern.repeat);
    const start = addState();
    const end = addState();
    states[start].epsilon.push(inner.start);
    states[inner.end].epsilon.push(end);
    if (pattern.min === 0) {
      states[start].epsilon.push(end);
    }
    if (pattern.max === null) {
      states[inner.end].epsilon.push(inner.start);
    }
    return { start, end };
  };

  const { start, end } = fragment(pattern);
  return { states, start, end };
};

/**
 * Add a state and the states its epsilons reach
 *
 * @type (states: State<unknown>[], state: number, reached: Set<number>) => void
 */
export const addReachable = (states, state, reached) => {
  if (reached.has(state)) {
    return;
  }

  reached.add(state);
  for (const next of states[state].epsilon) {
    addReachable(states, next, reached);
  }
};
