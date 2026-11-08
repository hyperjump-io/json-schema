import { relativeFileUri } from "@hyperjump/browser";
import { jsInstance } from "./instance.js";
import { codePointLengthIsWithin } from "../keywords/utilities.js";
import { keywordEvaluate } from "./definitions.js";
import { readsMarks } from "./kernel.js";

/**
 * @import { Json } from "@hyperjump/browser"
 * @import { Definitions } from "./definitions.js"
 * @import { EvaluateContext, Keyword } from "../keyword.d.ts"
 * @import { KernelSchema, Expression, Handle, ItemPattern, JsonTypeName, Kernel, Selector, TypeName } from "./kernel.d.ts"
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
 * @type (definitions: Definitions, kernel: Kernel) => (instance: Json) => boolean
 */
export const fast = (definitions, kernel) => {
  const tracksDynamicScope = kernel.reads.dynamicScope.length > 0;

  // An `opaque` operation can't stop early if it might get marks
  const marksAreRead = kernel.reads.evaluated.length > 0;

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
        throw Error(`The '${relativeFileUri(handle)}' schema wasn't compiled`);
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

  /** @type (compiled: KernelSchema) => Evaluator */
  const buildSchema = (compiled) => {
    if (typeof compiled === "boolean") {
      return () => compiled;
    }

    const expressions = compiled.keywords.map(({ expression }) => expression).filter((expression) => !isInert(expression));
    const { merged, rest } = mergeItems(expressions);
    const groups = merged === undefined ? mergeProperties(expressions) : [merged, ...mergeProperties(rest)];

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
      case "inline":
        return every(expression.keywords.map((group) => build(group.expression)));
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
      case "typeSwitch":
        return buildTypeSwitch(expression);
      case "propertySwitch":
        return buildPropertySwitch(expression);
      case "keySwitch":
        return buildKeySwitch(expression);
      case "cases": {
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

        const mask = typeMask(expression.types);
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
        // need `equal`.
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
        const isMultiple = multipleOf(expression.divisor);
        return (instance) => typeof instance !== "number" || isMultiple(instance);
      }

      case "stringLength": {
        const { min = 0, max = Infinity } = expression;
        return (instance) => {
          if (typeof instance !== "string") {
            return true;
          }
          return codePointLengthIsWithin(instance, min, max);
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
        const { types, validate } = definitions.formats[/** @type string */ (expression.uri)];
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
        return (instance) => !Array.isArray(instance) || unique(instance);
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
        const unevaluated = "unevaluated" in expression;
        if (!unevaluated && onlyTypes(expression.of) !== undefined) {
          const items = eachItemLoop(expression);
          return (instance, marks) => !Array.isArray(instance) || items(instance, marks);
        }

        const of = child(expression.of);
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
        const evaluate = keywordEvaluate(definitions, expression.keyword)(expression.value, { op: "predicate", instance: jsInstance });
        const isOfType = build({ op: "typeIs", types: expression.types });
        return (instance) => !isOfType(instance, undefined) || evaluate(instance);
      }
      case "opaque":
        return buildOpaque(expression);
    }
  };

  /**
   * Builds each branch of a switch once, where branches are the same
   * expression, like a `oneOf` schema that can pass more than one type
   *
   * @type () => (expression: Expression) => Evaluator
   */
  const branchBuilder = () => {
    /** @type Map<Expression, Evaluator> */
    const built = new Map();
    return (expression) => {
      let evaluator = built.get(expression);
      if (evaluator === undefined) {
        evaluator = build(expression);
        built.set(expression, evaluator);
      }
      return evaluator;
    };
  };

  /**
   * A `typeSwitch`, as the branch for each instance type, in the order of
   * `typeIndexes`
   *
   * @type (expression: Extract<Expression, { op: "typeSwitch" }>) => Evaluator
   */
  const buildTypeSwitch = ({ cases, otherwise }) => {
    const branch = branchBuilder();
    const branches = typeIndexes.map((type) => branch(cases[type] ?? otherwise));
    return (instance, marks) => branches[typeIndex(instance)](instance, marks);
  };

  /**
   * A `propertySwitch`, as a lookup by the property's value. A `Map`
   * compares scalars as JSON does: `1` is `1.0`, but not `"1"`.
   *
   * @type (expression: Extract<Expression, { op: "propertySwitch" }>) => Evaluator
   */
  const buildPropertySwitch = ({ name, cases, other, absent }) => {
    const branch = branchBuilder();
    /** @type Map<Json, Evaluator> */
    const branches = new Map();
    for (const [value, then] of cases) {
      if (!branches.has(value)) {
        branches.set(value, branch(then));
      }
    }
    const otherBranch = branch(other);
    const absentBranch = branch(absent);

    return (instance, marks) => {
      if (!isObject(instance)) {
        return true;
      } else if (!Object.hasOwn(instance, name)) {
        return absentBranch(instance, marks);
      }
      const value = instance[name];
      const evaluate = isScalar(value) ? branches.get(value) : undefined;
      return (evaluate ?? otherBranch)(instance, marks);
    };
  };

  /**
   * A `keySwitch`, testing whether the object has each case's property in
   * turn. A JS value is always parsed.
   *
   * @type (expression: Extract<Expression, { op: "keySwitch" }>) => Evaluator
   */
  const buildKeySwitch = ({ cases, none }) => {
    const branch = branchBuilder();
    const names = cases.map(([name]) => name);
    const branches = cases.map(([, then]) => branch(then));
    const noneBranch = branch(none);

    return (instance, marks) => {
      if (!isObject(instance)) {
        return true;
      }
      for (let index = 0; index < names.length; index++) {
        if (Object.hasOwn(instance, names[index])) {
          return branches[index](instance, marks);
        }
      }
      return noneBranch(instance, marks);
    };
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

    const evaluate = keywordEvaluate(definitions, expression.keyword)(expression.value, context);
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
   * A schema's `typeIs` of only `array`, `itemCount`, and `eachItem` (not
   * `unevaluated`), merged into one evaluator if it has two of them, which
   * tests whether the instance is an array once. Each is a call of its own
   * otherwise, and arrays of arrays, like GeoJSON's coordinates, made that
   * many calls for every array. The rest are evaluated after it, which
   * doesn't change the result, and `eachItem` marks before anything that
   * reads marks.
   *
   * @type (expressions: Expression[]) => { merged: Evaluator | undefined; rest: Expression[] }
   */
  const mergeItems = (expressions) => {
    const type = expressions.find((expression) => expression.op === "typeIs" && expression.types.length === 1 && expression.types[0] === "array");
    const count = expressions.find((expression) => expression.op === "itemCount");
    const each = expressions.find((expression) => expression.op === "eachItem" && !("unevaluated" in expression));
    if (Number(type !== undefined) + Number(count !== undefined) + Number(each !== undefined) < 2) {
      return { merged: undefined, rest: expressions };
    }

    const isArray = type !== undefined;
    const { min = 0, max = Infinity } = count?.op === "itemCount" ? count : {};
    const items = each?.op === "eachItem" && !("unevaluated" in each) ? eachItemLoop(each) : undefined;
    const rest = expressions.filter((expression) => expression !== type && expression !== count && expression !== each);
    return {
      merged: (instance, marks) => {
        if (!Array.isArray(instance)) {
          return !isArray;
        }
        return instance.length >= min && instance.length <= max && (items === undefined || items(instance, marks));
      },
      rest
    };
  };

  /**
   * `eachItem` (not `unevaluated`) on an array. An item schema that only
   * checks the type is checked in the loop instead of being called for each
   * item, which was most of the time on arrays of numbers.
   *
   * @type (expression: { from: number; of: Expression }) => (instance: Json[], marks: Marks) => boolean
   */
  const eachItemLoop = ({ from, of }) => {
    const types = onlyTypes(of);
    if (types === undefined) {
      const evaluate = child(of);
      return (instance, marks) => {
        for (let index = from; index < instance.length; index++) {
          if (!evaluate(instance[index], undefined)) {
            return false;
          }
          marks?.add(index);
        }
        return true;
      };
    }

    // Arrays of numbers and of strings are the most common, and `typeof`
    // with a literal type was faster than the mask
    if (types.length === 1 && types[0] === "number") {
      return (instance, marks) => {
        for (let index = from; index < instance.length; index++) {
          if (typeof instance[index] !== "number") {
            return false;
          }
          marks?.add(index);
        }
        return true;
      };
    } else if (types.length === 1 && types[0] === "string") {
      return (instance, marks) => {
        for (let index = from; index < instance.length; index++) {
          if (typeof instance[index] !== "string") {
            return false;
          }
          marks?.add(index);
        }
        return true;
      };
    }

    const mask = typeMask(types);
    const integer = types.includes("integer") && !types.includes("number");
    return (instance, marks) => {
      for (let index = from; index < instance.length; index++) {
        const item = instance[index];
        if ((mask & (1 << typeIndex(item))) === 0 && !(integer && Number.isInteger(item))) {
          return false;
        }
        marks?.add(index);
      }
      return true;
    };
  };

  /**
   * The types an expression checks, if that's all it does, including
   * through applying a schema that only checks the type
   *
   * @type (expression: Expression) => TypeName[] | undefined
   */
  const onlyTypes = (expression) => {
    if (expression.op === "apply" && typeof kernel.schemas[expression.schema] === "object") {
      const compiled = /** @type Exclude<KernelSchema, boolean> */ (kernel.schemas[expression.schema]);
      const expressions = compiled.keywords.map((group) => group.expression).filter((subexpression) => !isInert(subexpression));
      return expressions.length === 1 && expressions[0].op === "typeIs" ? expressions[0].types : undefined;
    }
    return expression.op === "typeIs" ? expression.types : undefined;
  };

  /**
   * A schema's property operations (`property`, and `eachProperty` with a
   * pattern or an `except`) in its groups' top-level `all`s, merged into one
   * loop over the properties, with its `hasProperty`s and a `typeIs` of only
   * `object`. A required name is counted when the loop gets to it, and the
   * type is the loop's test of whether the instance is an object, instead
   * of a call each with their own lookup. The rest are evaluated as they
   * are, before the loop. Evaluating them in a different order doesn't
   * change the result, and only operations that read marks, which aren't
   * merged, can see what's marked.
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
    /** @type Set<string> */
    const required = new Set();
    let isObjectType = false;
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
        } else if (operation.op === "hasProperty") {
          required.add(operation.name);
        } else if (operation.op === "typeIs" && operation.types.length === 1 && operation.types[0] === "object") {
          isObjectType = true;
        } else {
          rest.push(operation);
        }
      }
    }

    // With one property operation, looking its name up is faster than a
    // loop over every property, which is most of an object's properties
    if (named.size + patterns.length + excepts.length < 2) {
      return expressions.map(build);
    }

    return [...rest.map(build), propertyLoop(named, patterns, excepts, required, isObjectType), ...readingMarks.map(build)];
  };

  /**
   * Each name the loop looks up: what it's checked with, if anything, and
   * whether it's required. A property schema that only checks the type is
   * a mask, like an item schema in `eachItemLoop`. They all have the same shape, so reading
   * one is fast whichever it is.
   *
   * @typedef {{ property: boolean; of: Evaluator | undefined; mask: number; required: boolean }} NameEntry
   */

  /**
   * @type (
   *   namedExpressions: Map<string, Expression[]>,
   *   patternExpressions: [string, Expression][],
   *   exceptExpressions: [{ except: { names: string[]; patterns: string[] } }, Expression][],
   *   required: Set<string>,
   *   isObjectType: boolean
   * ) => Evaluator
   */
  const propertyLoop = (namedExpressions, patternExpressions, exceptExpressions, required, isObjectType) => {
    // Names are looked up in an object without a prototype, which was
    // faster than a `Map` (FLAG 11–23% on real schemas). No name is
    // inherited, not even `__proto__` or `constructor`.
    /** @type Record<string, NameEntry | undefined> */
    const entries = Object.create(null);
    for (const [name, of] of namedExpressions) {
      const types = of.length === 1 ? onlyTypes(of[0]) : undefined;
      entries[name] = types !== undefined && (!types.includes("integer") || types.includes("number"))
        ? { property: true, of: undefined, mask: typeMask(types), required: required.has(name) }
        : { property: true, of: child(of.length === 1 ? of[0] : { op: "all", of }), mask: 0, required: required.has(name) };
    }
    for (const name of required) {
      entries[name] ??= { property: false, of: undefined, mask: 0, required: true };
    }
    const requiredCount = required.size;
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
    const unmatchedExpressions = exceptExpressions.filter(([select]) => isOwn(select)).map(([, of]) => of);
    const others = exceptExpressions.filter(([select]) => !isOwn(select)).map(([select, of]) => /** @type const */ ([selector(select), child(of)]));

    // Without anything else to do for a name, each name's evaluator is
    // looked up and called, without an entry to read it from
    if (patterns.length === 0 && others.length === 0 && unmatchedExpressions.length === 0 && requiredCount === 0
      && Object.values(entries).every((entry) => entry?.of !== undefined)) {
      /** @type Record<string, Evaluator | undefined> */
      const named = Object.create(null);
      for (const name in entries) {
        named[name] = /** @type NameEntry */ (entries[name]).of;
      }
      return (instance, marks) => {
        if (!isObject(instance)) {
          return !isObjectType;
        }
        for (const name in instance) {
          const of = named[name];
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

    if (patterns.length === 0 && others.length === 0 && unmatchedExpressions.length <= 1) {
      // `additionalProperties: false` fails any other name without a call
      const [unmatchedExpression] = unmatchedExpressions;
      const unmatchedFails = unmatchedExpression !== undefined && fails(unmatchedExpression);
      const unmatched = unmatchedExpression === undefined || unmatchedFails ? undefined : child(unmatchedExpression);
      return (instance, marks) => {
        if (!isObject(instance)) {
          return !isObjectType;
        }
        let found = 0;
        for (const name in instance) {
          // The value is read first, every time. Reading it only where it's
          // used made V8 12.9+ (Node 23+) deoptimize this loop again and
          // again, which was 1.5–2.7× slower on schemas that spend their
          // time here (nest-cli, stale, semantic-release)
          const value = instance[name];
          const entry = entries[name];
          if (entry !== undefined && entry.property) {
            if (entry.of === undefined ? (entry.mask & (1 << typeIndex(value))) === 0 : !entry.of(value, undefined)) {
              return false;
            }
            marks?.add(name);
          } else if (unmatchedFails) {
            return false;
          } else if (unmatched !== undefined) {
            if (!unmatched(value, undefined)) {
              return false;
            }
            marks?.add(name);
          }
          if (entry !== undefined && entry.required) {
            found++;
          }
        }
        return found === requiredCount;
      };
    }

    const unmatched = unmatchedExpressions.map(child);
    return (instance, marks) => {
      if (!isObject(instance)) {
        return !isObjectType;
      }
      let found = 0;
      for (const name in instance) {
        const value = instance[name];
        let matched = false;
        const entry = entries[name];
        if (entry !== undefined) {
          if (entry.property) {
            if (entry.of === undefined ? (entry.mask & (1 << typeIndex(value))) === 0 : !entry.of(value, undefined)) {
              return false;
            }
            matched = true;
          }
          if (entry.required) {
            found++;
          }
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
      return found === requiredCount;
    };
  };

  /**
   * Whether an expression fails every instance, including through applying
   * the `false` schema
   *
   * @type (expression: Expression) => boolean
   */
  const fails = (expression) => expression.op === "fail" || (expression.op === "apply" && kernel.schemas[expression.schema] === false);

  const root = schema(kernel.uri);

  // Without a dynamic scope, nothing sets it, so there's nothing to restore.
  // The wrapper was about a fifth of FLAG on yamllint.
  if (!tracksDynamicScope) {
    return (instance) => root(instance, undefined);
  }

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

/** @type JsonTypeName[] */
export const typeIndexes = ["null", "boolean", "number", "string", "array", "object"];

/**
 * A test of whether a value is a multiple of `divisor`, as the decimals
 * they're written as. Floating point can't represent most decimals, so
 * dividing them is inexact. Instead, both are scaled by a power of ten to
 * integers, with as many decimal places as `divisor` has, and the integers
 * are divided. A multiple can't have more decimal places than `divisor`.
 * Scaling multiplies by a power of ten, which is exact up to 1e22, and
 * rounds. Below 2^50, the multiplication is off by much less than 0.5, so
 * rounding gives the right integer. Otherwise, the shortest decimals are
 * compared as `BigInt`s. The divisor's scale is found once, so evaluators
 * make the test when they're compiled.
 *
 * @type (divisor: number) => (value: number) => boolean
 */
export const multipleOf = (divisor) => {
  let scale = 1;
  while (Math.round(divisor * scale) / scale !== divisor) {
    if (scale === 1e22) {
      return (value) => decimalIsMultipleOf(value, divisor);
    }
    scale *= 10;
  }

  const scaledDivisor = Math.round(divisor * scale);
  if (scaledDivisor >= 2 ** 50) {
    return (value) => decimalIsMultipleOf(value, divisor);
  }

  return (value) => {
    const scaledValue = Math.round(value * scale);
    if (Math.abs(scaledValue) >= 2 ** 50) {
      return decimalIsMultipleOf(value, divisor);
    }
    return scaledValue / scale === value && scaledValue % scaledDivisor === 0;
  };
};

/** @type (value: number, divisor: number) => boolean */
const decimalIsMultipleOf = (value, divisor) => {
  const [valueDigits, valueExponent] = decimal(value);
  const [divisorDigits, divisorExponent] = decimal(divisor);
  const exponent = Math.min(valueExponent, divisorExponent);
  return valueDigits * 10n ** BigInt(valueExponent - exponent)
    % (divisorDigits * 10n ** BigInt(divisorExponent - exponent)) === 0n;
};

/**
 * The digits and exponent of a number's shortest decimal, without its sign.
 * `1.25e-7` is `[125n, -9]`.
 *
 * @type (number: number) => [bigint, number]
 */
const decimal = (number) => {
  const [mantissa, exponent = "0"] = String(Math.abs(number)).split("e");
  const [whole, fraction = ""] = mantissa.split(".");
  return [BigInt(whole + fraction), Number(exponent) - fraction.length];
};

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

/**
 * @param {Json} instance
 * @returns {instance is JsonObject}
 */
const isObject = (instance) => typeof instance === "object" && instance !== null && !Array.isArray(instance);

/** @type (value: Json) => boolean */
const isScalar = (value) => value === null || typeof value !== "object";

/**
 * Whether two values are equal as JSON. It's `instanceEqual` for plain
 * values, without reading them through instance operations, which made
 * `uniqueItems` on arrays of objects about twice as slow.
 *
 * @type (a: Json, b: Json) => boolean
 */
const equal = (a, b) => {
  if (a === b) {
    return true;
  } else if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) {
    return false;
  } else if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) {
      return false;
    }
    for (let index = 0; index < a.length; index++) {
      if (!equal(a[index], b[index])) {
        return false;
      }
    }
    return true;
  } else if (Array.isArray(b)) {
    return false;
  }

  // Every name of `a` is in `b` with an equal value, and `b` has no others
  for (const name in a) {
    if (!Object.hasOwn(b, name) || !equal(a[name], b[name])) {
      return false;
    }
  }
  for (const name in b) {
    if (!Object.hasOwn(a, name)) {
      return false;
    }
  }
  return true;
};

/**
 * Whether an array's items are unique. Short arrays compare every pair.
 * In longer ones, scalars are looked up in a set, arrays are compared with
 * the arrays of the same length, and objects with the objects with the
 * same value of one property (the first object's first), which equal
 * objects have. That's arrays of objects with names, like plugins or
 * dependencies, compared with almost none of the others.
 *
 * @type (array: Json[]) => boolean
 */
const unique = (array) => {
  if (array.length < 8) {
    for (let i = 1; i < array.length; i++) {
      for (let j = 0; j < i; j++) {
        if (equal(array[j], array[i])) {
          return false;
        }
      }
    }
    return true;
  }

  /** @type Set<Json> */
  const scalars = new Set();
  /** @type Map<number, Json[]> */
  const arrays = new Map();
  /** @type Map<unknown, Json[]> */
  const objects = new Map();
  /** @type string | undefined */
  let probe;
  for (const item of array) {
    /** @type Json[] | undefined */
    let bucket;
    if (typeof item !== "object" || item === null) {
      if (scalars.has(item)) {
        return false;
      }
      scalars.add(item);
      continue;
    } else if (Array.isArray(item)) {
      bucket = arrays.get(item.length);
      if (bucket === undefined) {
        bucket = [];
        arrays.set(item.length, bucket);
      }
    } else {
      if (probe === undefined) {
        for (const name in item) {
          probe = name;
          break;
        }
      }
      // Objects whose value is an array or object share a bucket
      const value = probe === undefined ? undefined : item[probe];
      const key = typeof value === "object" && value !== null ? objects : value;
      bucket = objects.get(key);
      if (bucket === undefined) {
        bucket = [];
        objects.set(key, bucket);
      }
    }

    for (let index = 0; index < bucket.length; index++) {
      if (equal(bucket[index], item)) {
        return false;
      }
    }
    bucket.push(item);
  }
  return true;
};

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
 * A bit for each of `types` in `typeIndexes`. An integer's index is
 * `number`'s, so `integer` without `number` has to be checked too.
 *
 * @type (types: TypeName[]) => number
 */
const typeMask = (types) => {
  let mask = 0;
  for (const [index, type] of typeIndexes.entries()) {
    if (types.includes(type)) {
      mask |= 1 << index;
    }
  }
  return mask;
};

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
