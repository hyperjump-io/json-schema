import { relativeFileUri } from "@hyperjump/browser";
import * as JsonPointer from "@hyperjump/json-pointer";
import { keywordDefinitionUri } from "../keywords/unknown.js";
import { codePointLengthIsWithin, instanceEqual } from "../keywords/utilities.js";
import { jsInstance } from "./instance.js";
import { conditionsOf, explainsFailure, readsMarks, subexpressions } from "./kernel.js";
import { keywordEvaluate } from "./definitions.js";
import { addDynamicAnchors, addReachable, itemSequenceStates, multipleOf, selector, typeIndexes } from "./fast.js";

/**
 * @import { Data, Node } from "unist"
 * @import { Json, ReadonlyJson } from "@hyperjump/browser"
 * @import { Definitions } from "./definitions.js"
 * @import { EvaluateContext, InstanceOps } from "../keyword.d.ts"
 * @import { EvaluationLocation, EvaluationPlugin, KeywordInfo, SchemaInfo } from "./evaluation-plugin.d.ts"
 * @import { Expression, Handle, ItemPattern, Kernel, KeywordGroup, TypeName } from "./kernel.d.ts"
 */

/**
 * The marks an evaluator makes, or undefined if nothing reads them
 *
 * @typedef {Set<string | number> | undefined} Marks
 */

/**
 * @template I
 * @typedef {(instance: I, marks: Marks) => boolean} Evaluator
 */

/**
 * Evaluates a schema on an instance. `segment` is the property name or item
 * index when it's a child of the instance the caller evaluates.
 *
 * @template I
 * @typedef {(instance: I, marks: Marks, segment?: string | number) => boolean} SchemaEvaluator
 */

/**
 * Each property match of a merged loop, flat so it's one allocation: the
 * group's slot, the name, the value, and the evaluator. The first item is
 * a bit for each required name the instance has (see `requiredBits`).
 *
 * @template I
 * @typedef {(number | string | I | SchemaEvaluator<I>)[]} Matches
 */

/**
 * Annotations are collected in one list, flat, three items each: the node,
 * the keyword URI, and the value. A schema that fails, which it does if any
 * of its groups fails, drops what was added since it started, which is
 * everything its groups and what they applied added, by cutting the list
 * back to where it was.
 *
 * @typedef {(Node | string | Json)[]} Annotations
 */

/**
 * @template I
 * @typedef {{
 *   instance: InstanceOps<I>;
 *   isAst: boolean;
 *   annotating: boolean;
 *   instrumented: boolean;
 * }} InstrumentedOptions
 */

/**
 * @template I
 * @typedef {(instance: I, plugins?: EvaluationPlugin[]) => boolean} Instrumented
 */

/** @type EvaluationPlugin */
const noPlugin = {};

/**
 * A bit for each instance type, so a `typeIs` of more than one type is one
 * test
 *
 * @type Record<string, number>
 */
const typeBits = { null: 1, boolean: 2, number: 4, string: 8, array: 16, object: 32 };

/**
 * Evaluation with plugins, of plain values or JSON AST nodes, and of ASTs
 * without plugins, which includes annotating. With plugins or annotating,
 * every subexpression is evaluated, so nothing stops early, and a plugin
 * sees every keyword that applies. Without either, only the result and marks
 * matter, so a schema stops at its first failing group, `any` at its first
 * passing subexpression if nothing reads marks, and `eachItem` at its first
 * failing item.
 *
 * - `isAst`: The instance is a JSON AST. Values that couldn't be parsed pass
 *   every schema.
 * - `annotating`: Collect annotations and attach them to the instance's
 *   nodes. They're kept only if the keyword and every schema they were
 *   evaluated through pass. Only for ASTs.
 * - `instrumented`: Run plugins. Instance locations are only tracked for
 *   plugins.
 *
 * Plugins see keyword groups, never operations. A group's property
 * operations are one loop over the instance's properties, which is the
 * order `properties` and `patternProperties` evaluated in before the
 * kernel. Across a schema's groups, only finding which operations each
 * property is for is merged. Each group evaluates its matches between its
 * own hooks, so hook calls nest.
 *
 * Evaluation state lives in this closure. An evaluation that starts while
 * another one is in progress, like one a plugin starts, saves the outer
 * one's state and restores it when it's done.
 *
 * @type <I>(definitions: Definitions, kernel: Kernel, options: InstrumentedOptions<I>) => Instrumented<I>
 */
export const instrumented = (definitions, kernel, options) => {
  const { instance: ops, isAst, annotating, instrumented: tracking } = options;

  const tracksDynamicScope = kernel.reads.dynamicScope.length > 0;
  // Only the result and marks can be seen
  const stopsEarly = !annotating && !tracking;

  /** @typedef {Parameters<typeof ops.typeOf>[0]} I */

  /** @type EvaluationPlugin */
  let plugin = noPlugin;
  /** @type unknown */
  let keywordState;
  // The state of the schema being evaluated, for the groups `inline` puts
  // in it
  /** @type unknown */
  let schemaState;
  /** @type I | undefined */
  let currentInstance;
  /** @type Location | undefined */
  let currentAt;
  /** @type string | undefined */
  let currentResource;
  /** @type Record<string, Handle> | undefined */
  let dynamicAnchors;

  // The annotations kept so far, if annotating
  /** @type Annotations */
  let annotations = [];

  /** @type (instance: I, value: Json) => boolean */
  const equal = (instance, value) => instanceEqual(ops, instance, jsInstance, value, true);

  /**
   * Move evaluation to a child of the instance, like a schema evaluator
   * does, and return what to restore, for an expression that isn't a schema
   *
   * @type (instance: I, segment: string | number | undefined) => [I | undefined, Location | undefined]
   */
  const enter = (instance, segment) => {
    const outer = /** @type [I | undefined, Location | undefined] */ ([currentInstance, currentAt]);
    const outerInstance = currentInstance;
    currentInstance = instance;
    // A schema evaluated on the same instance, like through `allOf` or
    // `$ref`, shares its location
    if (tracking && (segment !== undefined || outerInstance !== instance || currentAt === undefined)) {
      currentAt = new Location(currentAt, segment, isAst ? /** @type EvaluationLocation["node"] */ (instance) : undefined, instance, ops);
    }
    return outer;
  };

  /** @type (outer: [I | undefined, Location | undefined]) => void */
  const leave = ([outerInstance, outerAt]) => {
    currentInstance = outerInstance;
    currentAt = outerAt;
  };

  /** @type (info: KeywordInfo, value: Json) => void */
  const annotate = (info, value) => {
    if (annotating) {
      annotations.push(/** @type Node */ (currentInstance), info.keywordUri, value);
    }
    plugin.annotation?.(info, /** @type EvaluationLocation */ (currentAt), value, keywordState);
  };

  // An AST object's properties are its children, so they're read without
  // making an array of entries for each object
  /** @type (instance: I) => unknown[] */
  const propertiesOf = isAst
    ? (instance) => /** @type any */ (instance).children
    : (instance) => /** @type unknown[] */ (ops.entries(instance));
  /** @type (entry: unknown) => string */
  const propertyName = isAst ? (entry) => /** @type any */ (entry).children[0].value : (entry) => /** @type any */ (entry)[0];
  /** @type (entry: unknown) => I */
  const propertyValue = isAst ? (entry) => /** @type any */ (entry).children[1] : (entry) => /** @type any */ (entry)[1];

  /**
   * The bits of the types a schema only checks the type for, or 0 if it does
   * more, or checks `integer` without `number`, which needs the value
   *
   * @type (of: Expression) => number
   */
  const typeOnlyMask = (of) => {
    let expression = of;
    if (of.op === "apply") {
      const compiled = kernel.schemas[of.schema];
      const expressions = typeof compiled === "object"
        ? compiled.keywords.map((group) => group.expression).filter((subexpression) => subexpression.op !== "pass" && subexpression.op !== "annotate")
        : [];
      if (expressions.length !== 1) {
        return 0;
      }
      expression = expressions[0];
    }
    if (expression.op !== "typeIs" || (expression.types.includes("integer") && !expression.types.includes("number"))) {
      return 0;
    }
    let mask = 0;
    for (const type of expression.types) {
      mask |= typeBits[type === "integer" ? "number" : type];
    }
    return mask;
  };

  /** @type (mask: number, instance: I) => boolean */
  const isOfType = (mask, instance) => {
    const type = ops.typeOf(instance);
    return type === undefined || (mask & typeBits[type]) !== 0;
  };

  /** @type Map<Handle, SchemaEvaluator<I>> */
  const evaluators = new Map();

  /** @type (handle: Handle) => SchemaEvaluator<I> */
  const schema = (handle) => {
    let evaluator = evaluators.get(handle);
    if (evaluator === undefined) {
      if (!(handle in kernel.schemas)) {
        throw Error(`The '${relativeFileUri(handle)}' schema wasn't compiled`);
      }

      // Schemas can refer to themselves, so it's built after it's cached
      /** @type SchemaEvaluator<I> | undefined */
      let built;
      evaluator = (instance, marks, segment) => /** @type SchemaEvaluator<I> */ (built)(instance, marks, segment);
      evaluators.set(handle, evaluator);
      built = buildSchema(handle);
      evaluators.set(handle, built);
      evaluator = built;
    }

    return evaluator;
  };

  /**
   * Where a schema is. A copy an optimization made has a handle that isn't
   * a location, so it's where the schema it copies is.
   *
   * @type (handle: Handle) => string
   */
  const locationOf = (handle) => {
    const compiled = kernel.schemas[handle];
    return typeof compiled === "object" && compiled.copyOf !== undefined ? compiled.copyOf : handle;
  };

  // A copy of a schema has the same infos as the schema, so each schema and
  // keyword has one, whichever copy is evaluated. Its expression is the
  // first copy's, and can apply copies.
  /** @type Map<string, SchemaInfo> */
  const schemaInfos = new Map();
  /** @type Map<string, KeywordInfo> */
  const keywordInfos = new Map();

  /** @type (group: KeywordGroup) => KeywordInfo */
  const keywordInfo = ({ keywordUri, location, sources, expression }) => {
    let info = keywordInfos.get(location);
    if (info === undefined) {
      info = {
        keywordUri,
        absoluteKeywordLocation: location,
        keyword: definitions.keywords[keywordDefinitionUri(keywordUri)],
        expression,
        sources,
        explainsFailure: explainsFailure(expression),
        conditions: new Set([...conditionsOf(expression)].map(locationOf))
      };
      keywordInfos.set(location, info);
    }
    return info;
  };

  /** @type Map<Handle, boolean> */
  const schemasThatMark = new Map();

  /**
   * Whether an expression can mark the instance it's evaluated on. Unknown
   * is yes: a schema that's still being worked out, because it applies
   * itself, `dynamicApply`, and `opaque`.
   *
   * @type (expression: Expression) => boolean
   */
  const canMark = (expression) => {
    switch (expression.op) {
      case "property":
      case "eachProperty":
      case "item":
      case "eachItem":
      case "contains":
      case "itemSequence":
      case "dynamicApply":
      case "opaque":
        return true;
      // What `not` applies only passes if `not` fails, so its marks aren't
      // kept, and `eachPropertyName` doesn't mark the object
      case "not":
      case "eachPropertyName":
        return false;
      case "apply": {
        let marks = schemasThatMark.get(expression.schema);
        if (marks === undefined) {
          schemasThatMark.set(expression.schema, true);
          const compiled = kernel.schemas[expression.schema];
          marks = typeof compiled === "object" && compiled.keywords.some((group) => canMark(group.expression));
          schemasThatMark.set(expression.schema, marks);
        }
        return marks;
      }
      default:
        return subexpressions(expression).some(canMark);
    }
  };

  /**
   * The marks an expression is evaluated with, which are kept only if it
   * passes (see `startMarks`)
   *
   * @type (expression: Expression) => MarksMode
   */
  const marksMode = (expression) => {
    if (readsMarks(expression)) {
      return COPY;
    }
    return canMark(expression) ? EMPTY : NONE;
  };

  /** @type (handle: Handle) => SchemaEvaluator<I> */
  const buildSchema = (handle) => {
    const compiled = kernel.schemas[handle];

    const location = locationOf(handle);
    let info = schemaInfos.get(location);
    if (info === undefined) {
      info = { absoluteKeywordLocation: location };
      if (typeof compiled === "boolean") {
        info.booleanSchema = compiled;
      }
      schemaInfos.set(location, info);
    }
    const resource = typeof compiled === "boolean" ? handle.replace(/#.*$/, "") : compiled.resource;
    const resourceAnchors = kernel.resources[resource]?.dynamicAnchors ?? {};

    // Without plugins, a group with no effect is left out, as in `fast.js`.
    // With plugins, `drop-groups` leaves out what they can't see.
    /** @type KeywordGroup[] */
    let keywordGroups = typeof compiled === "boolean" ? [] : compiled.keywords;
    if (!tracking) {
      keywordGroups = keywordGroups.filter(({ expression }) => expression.op !== "pass" && (annotating || expression.op !== "annotate"));
    }
    // Without plugins or annotating, nothing happens between one group and
    // the next, so a schema whose groups don't read marks is an `all` of
    // their expressions, as in `fast.js`: its property operations are one
    // loop, and it stops at the first failure
    if (stopsEarly && !keywordGroups.some(({ expression }) => readsMarks(expression))) {
      return buildLeanSchema(compiled, keywordGroups, resource, resourceAnchors);
    }

    const infos = new Map(keywordGroups.map((group) => [group, keywordInfo(group)]));
    const merged = mergeable(keywordGroups);
    const bits = merged.length > 1 ? requiredBits(keywordGroups) : new Map();
    const matcher = merged.length > 1
      ? buildMatcher(merged.map((group) => /** @type const */ ([group.expression, /** @type KeywordInfo */ (infos.get(group))])), bits)
      : undefined;
    const groups = keywordGroups.map((group) => {
      const groupInfo = /** @type KeywordInfo */ (infos.get(group));
      const slot = matcher === undefined ? -1 : merged.indexOf(group);
      const required = slot === -1 ? requiredMask(group.expression, bits) : 0;
      return {
        info: groupInfo,
        evaluate: slot === -1 && required === 0 ? build(group.expression, groupInfo) : undefined,
        slot,
        required,
        marks: marksMode(group.expression)
      };
    });
    const ownMarks = keywordGroups.some(({ expression }) => readsMarks(expression));

    return (instance, marks, segment) => {
      if (isAst && ops.typeOf(instance) === undefined) {
        return true;
      }

      const outerInstance = currentInstance;
      const outerAt = currentAt;
      currentInstance = instance;
      // A schema evaluated on the same instance, like through `allOf` or
      // `$ref`, shares its location
      if (tracking && (segment !== undefined || outerInstance !== instance || currentAt === undefined)) {
        currentAt = new Location(currentAt, segment, isAst ? /** @type EvaluationLocation["node"] */ (instance) : undefined, instance, ops);
      }

      const outerResource = currentResource;
      const outerAnchors = dynamicAnchors;
      if (tracksDynamicScope && resource !== currentResource) {
        currentResource = resource;
        dynamicAnchors = addDynamicAnchors(resourceAnchors, dynamicAnchors);
      }

      const schemaStart = annotating ? annotations.length : 0;

      const parentState = keywordState;
      const schemaAt = /** @type EvaluationLocation */ (currentAt);
      const outerSchemaState = schemaState;
      const ownState = plugin.beforeSchema?.(info, schemaAt, parentState);
      schemaState = ownState;

      // Marks are kept only for groups that pass, and only if something
      // reads them. A group starts with what's marked so far, so an
      // `unevaluated` selector sees what the groups before it marked.
      const schemaMarks = ownMarks || marks !== undefined ? new Set() : undefined;
      let valid = typeof compiled === "boolean" ? compiled : true;
      /** @type Matches<I> | undefined */
      let matches;
      for (const group of groups) {
        const keywordAt = /** @type EvaluationLocation */ (currentAt);
        const state = plugin.beforeKeyword?.(group.info, keywordAt, ownState);
        keywordState = state;

        const groupMarks = schemaMarks && startMarks(group.marks, schemaMarks);
        let isGroupValid;
        if (group.evaluate !== undefined) {
          isGroupValid = group.evaluate(instance, groupMarks);
        } else if (group.required !== 0) {
          matches ??= /** @type NonNullable<typeof matcher> */ (matcher)(instance);
          isGroupValid = ops.typeOf(instance) !== "object" || ((/** @type number */ (matches[0]) & group.required) === group.required);
        } else {
          matches ??= /** @type NonNullable<typeof matcher> */ (matcher)(instance);
          isGroupValid = evaluateMatches(matches, group.slot, groupMarks);
        }

        plugin.afterKeyword?.(group.info, keywordAt, isGroupValid, state, ownState);
        keywordState = parentState;

        // A group's marks are only kept if it passes. Its annotations are only
        // kept if the schema passes, which it doesn't if a group fails.
        if (isGroupValid) {
          addAll(schemaMarks, groupMarks);
        } else {
          valid = false;
          if (stopsEarly) {
            break;
          }
        }
      }

      // A schema's marks and annotations are only kept if it passes
      if (valid) {
        addAll(marks, schemaMarks);
      } else if (annotations.length > schemaStart) {
        // Setting the length is a call into the runtime, even when it
        // doesn't change, and most schemas that fail didn't annotate
        annotations.length = schemaStart;
      }

      schemaState = outerSchemaState;
      plugin.afterSchema?.(info, schemaAt, valid, ownState, parentState);

      currentInstance = outerInstance;
      currentAt = outerAt;
      currentResource = outerResource;
      dynamicAnchors = outerAnchors;

      return valid;
    };
  };

  /**
   * A schema without plugins or annotating, whose groups don't read marks
   *
   * @type (compiled: Kernel["schemas"][Handle], keywordGroups: KeywordGroup[], resource: string, resourceAnchors: Record<string, Handle>) => SchemaEvaluator<I>
   */
  const buildLeanSchema = (compiled, keywordGroups, resource, resourceAnchors) => {
    /** @type Evaluator<I> */
    let evaluate;
    if (typeof compiled === "boolean") {
      evaluate = () => compiled;
    } else {
      const expressions = keywordGroups.flatMap(({ expression }) => expression.op === "all" ? expression.of : [expression]);
      // The info is only for hooks and annotations, which there aren't
      const info = keywordGroups.length === 0 ? undefined : keywordInfo(keywordGroups[0]);
      const { merged, rest } = mergeItems(expressions, /** @type KeywordInfo */ (info));
      const others = rest.length === 0 ? undefined : buildAll(rest, /** @type KeywordInfo */ (info));
      if (merged === undefined) {
        evaluate = others ?? (() => true);
      } else if (others === undefined) {
        evaluate = merged;
      } else {
        evaluate = (instance, marks) => merged(instance, marks) && others(instance, marks);
      }
    }

    if (!tracksDynamicScope) {
      return (instance, marks) => (isAst && ops.typeOf(instance) === undefined) || evaluate(instance, marks);
    }

    return (instance, marks) => {
      if (isAst && ops.typeOf(instance) === undefined) {
        return true;
      } else if (resource === currentResource) {
        return evaluate(instance, marks);
      }

      const outerResource = currentResource;
      const outerAnchors = dynamicAnchors;
      currentResource = resource;
      dynamicAnchors = addDynamicAnchors(resourceAnchors, dynamicAnchors);
      const valid = evaluate(instance, marks);
      currentResource = outerResource;
      dynamicAnchors = outerAnchors;
      return valid;
    };
  };

  /**
   * A schema's `typeIs` of only `array`, `itemCount`, and `eachItem` (not
   * `unevaluated`), if it has two or more of them, as one evaluator that
   * tests whether the instance is an array once, as in `fast.js`
   *
   * @type (expressions: Expression[], info: KeywordInfo) => { merged: Evaluator<I> | undefined; rest: Expression[] }
   */
  const mergeItems = (expressions, info) => {
    const type = expressions.find((expression) => expression.op === "typeIs" && expression.types.length === 1 && expression.types[0] === "array");
    const count = expressions.find((expression) => expression.op === "itemCount");
    const each = expressions.find((expression) => expression.op === "eachItem" && !("unevaluated" in expression));
    if (Number(type !== undefined) + Number(count !== undefined) + Number(each !== undefined) < 2) {
      return { merged: undefined, rest: expressions };
    }

    const isArray = type !== undefined;
    const { min = 0, max = Infinity } = count?.op === "itemCount" ? count : {};
    const from = each?.op === "eachItem" && "from" in each ? each.from : 0;
    const of = each?.op === "eachItem" ? applyTo(each.of, info) : undefined;
    const rest = expressions.filter((expression) => expression !== type && expression !== count && expression !== each);
    return {
      merged: (instance, marks) => {
        if (ops.typeOf(instance) !== "array") {
          return !isArray;
        }
        const length = ops.length(instance);
        if (length < min || length > max) {
          return false;
        } else if (of === undefined) {
          return true;
        }
        // Both kinds of instance have their items in an array
        const items = /** @type I[] */ (ops.items(instance));
        for (let index = from; index < items.length; index++) {
          if (!of(items[index], undefined, index)) {
            return false;
          }
          marks?.add(index);
        }
        return true;
      },
      rest
    };
  };

  /**
   * Evaluate an expression on a child of the instance, which has its own
   * marks. It's usually a schema (`apply`), which moves evaluation to the
   * child itself. Any other expression moves there too, so its annotations
   * are on the child.
   *
   * @type (of: Expression, info: KeywordInfo) => SchemaEvaluator<I>
   */
  const applyTo = (of, info) => {
    if (of.op === "apply") {
      return schema(of.schema);
    }

    const evaluate = build(of, info);
    const ownMarks = readsMarks(of);
    return (instance, _marks, segment) => {
      if (isAst && ops.typeOf(instance) === undefined) {
        return true;
      }

      const outer = enter(instance, segment);
      const valid = evaluate(instance, ownMarks ? new Set() : undefined);
      leave(outer);
      return valid;
    };
  };

  /**
   * Builds each branch of a switch once, where branches are the same
   * expression, like a `oneOf` schema that can pass more than one type
   *
   * @type (info: KeywordInfo) => (expression: Expression) => Evaluator<I>
   */
  const branchBuilder = (info) => {
    /** @type Map<Expression, Evaluator<I>> */
    const built = new Map();
    return (expression) => {
      let evaluator = built.get(expression);
      if (evaluator === undefined) {
        evaluator = build(expression, info);
        built.set(expression, evaluator);
      }
      return evaluator;
    };
  };

  /** @type (expression: Expression, info: KeywordInfo) => Evaluator<I> */
  const build = (expression, info) => {
    switch (expression.op) {
      case "pass":
        return () => true;
      case "fail":
        return () => false;
      case "all":
        return buildAll(expression.of, info);
      case "any": {
        const of = expression.of.map((subexpression) => build(subexpression, info));
        const modes = expression.of.map(marksMode);
        return (instance, marks) => {
          if (stopsEarly && marks === undefined) {
            for (const evaluate of of) {
              if (evaluate(instance, undefined)) {
                return true;
              }
            }
            return false;
          }
          let valid = false;
          for (let index = 0; index < of.length; index++) {
            const own = marks && startMarks(modes[index], marks);
            if (of[index](instance, own)) {
              valid = true;
              addAll(marks, own);
            }
          }
          return valid;
        };
      }
      case "one": {
        const of = expression.of.map((subexpression) => build(subexpression, info));
        const modes = expression.of.map(marksMode);
        return (instance, marks) => {
          /** @type Marks */
          let passed;
          let count = 0;
          for (let index = 0; index < of.length; index++) {
            const own = marks && startMarks(modes[index], marks);
            if (of[index](instance, own)) {
              count++;
              passed = own;
            }
          }
          if (count === 1) {
            addAll(marks, passed);
          }
          return count === 1;
        };
      }
      case "not": {
        const of = build(expression.of, info);
        return (instance) => !of(instance, undefined);
      }
      // An instance that couldn't be parsed passes
      case "typeSwitch": {
        const branch = branchBuilder(info);
        /** @type Record<string, Evaluator<I>> */
        const branches = Object.fromEntries(typeIndexes.map((type) => [type, branch(expression.cases[type] ?? expression.otherwise)]));
        return (instance, marks) => {
          const type = ops.typeOf(instance);
          return type === undefined || branches[type](instance, marks);
        };
      }
      case "propertySwitch": {
        const { name } = expression;
        const branch = branchBuilder(info);
        /** @type Map<ReadonlyJson, Evaluator<I>> */
        const branches = new Map();
        for (const [value, then] of expression.cases) {
          if (!branches.has(value)) {
            branches.set(value, branch(then));
          }
        }
        const other = branch(expression.other);
        const absent = branch(expression.absent);
        const unparsed = branch(expression.unparsed);
        return (instance, marks) => {
          if (ops.typeOf(instance) !== "object") {
            return true;
          }
          const property = ops.get(instance, name);
          if (property === undefined) {
            return absent(instance, marks);
          }
          const type = ops.typeOf(property);
          if (type === undefined) {
            return unparsed(instance, marks);
          }
          const evaluate = type === "object" || type === "array" ? undefined : branches.get(ops.value(property));
          return (evaluate ?? other)(instance, marks);
        };
      }
      case "keySwitch": {
        const branch = branchBuilder(info);
        const names = expression.cases.map(([name]) => name);
        const branches = expression.cases.map(([, then]) => branch(then));
        const none = branch(expression.none);
        const unparsed = branch(expression.unparsed);
        return (instance, marks) => {
          if (ops.typeOf(instance) !== "object") {
            return true;
          }
          let has = false;
          for (let index = 0; index < names.length; index++) {
            const property = ops.get(instance, names[index]);
            if (property !== undefined) {
              if (ops.typeOf(property) !== undefined) {
                return branches[index](instance, marks);
              }
              has = true;
            }
          }
          return (has ? unparsed : none)(instance, marks);
        };
      }
      case "cases": {
        const cases = expression.cases.map(([condition, then]) => /** @type const */ ([build(condition, info), then && build(then, info), marksMode(condition)]));
        const otherwise = expression.otherwise && build(expression.otherwise, info);
        return (instance, marks) => {
          for (const [condition, then, mode] of cases) {
            const own = marks && startMarks(mode, marks);
            if (condition(instance, own)) {
              addAll(marks, own);
              return then === null || then(instance, marks);
            }
          }
          return otherwise === null || otherwise(instance, marks);
        };
      }
      case "apply":
        return schema(expression.schema);
      case "inline": {
        // The schema's groups, as groups of the schema they're in: each with
        // its own hooks, nested in the group they're in, without the
        // schema's own
        const groups = expression.keywords.map((group) => {
          const groupInfo = keywordInfo(group);
          return { info: groupInfo, evaluate: build(group.expression, groupInfo) };
        });
        return (instance, marks) => {
          const inSchemaState = schemaState;
          const parentState = keywordState;
          let valid = true;
          for (const group of groups) {
            const keywordAt = /** @type EvaluationLocation */ (currentAt);
            const state = plugin.beforeKeyword?.(group.info, keywordAt, inSchemaState);
            keywordState = state;
            const isGroupValid = group.evaluate(instance, marks);
            plugin.afterKeyword?.(group.info, keywordAt, isGroupValid, state, inSchemaState);
            keywordState = parentState;
            if (!isGroupValid) {
              valid = false;
              if (stopsEarly) {
                break;
              }
            }
          }
          return valid;
        };
      }
      case "dynamicApply": {
        const { anchor, fallback } = expression;
        return (instance, marks) => {
          const handle = dynamicAnchors?.[anchor] ?? fallback;
          if (handle === null) {
            throw Error(`No '${anchor}' dynamic anchor is in the dynamic scope`);
          }
          return schema(handle)(instance, marks);
        };
      }

      case "typeIs": {
        /** @type Set<string> */
        const types = new Set(expression.types);
        if (types.size === 1 && !types.has("integer")) {
          const [only] = types;
          return (instance) => {
            const type = ops.typeOf(instance);
            return type === undefined || type === only;
          };
        }
        let mask = 0;
        for (const type of types) {
          mask |= typeBits[type] ?? 0;
        }
        if (!types.has("integer") || types.has("number")) {
          return (instance) => {
            const type = ops.typeOf(instance);
            return type === undefined || (mask & typeBits[type]) !== 0;
          };
        }
        return (instance) => {
          const type = ops.typeOf(instance);
          return type === undefined || (mask & typeBits[type]) !== 0 || (type === "number" && Number.isInteger(ops.value(instance)));
        };
      }
      case "equals": {
        const { value } = expression;
        return (instance) => equal(instance, value);
      }
      case "oneOfValues": {
        // Scalars are compared with a lookup. Only arrays and objects need
        // `equal`.
        /** @type Set<ReadonlyJson> */
        const scalars = new Set();
        /** @type Json[] */
        const structured = [];
        for (const value of expression.values) {
          if (typeof value === "object" && value !== null) {
            structured.push(value);
          } else {
            scalars.add(value);
          }
        }
        return (instance) => {
          const type = ops.typeOf(instance);
          if (type === undefined) {
            return true;
          }
          return type === "object" || type === "array"
            ? structured.some((value) => equal(instance, value))
            : scalars.has(ops.value(instance));
        };
      }

      case "range": {
        const { min = -Infinity, max = Infinity, exclusiveMin = false, exclusiveMax = false } = expression;
        return (instance) => {
          if (ops.typeOf(instance) !== "number") {
            return true;
          }
          const value = /** @type number */ (ops.value(instance));
          return (exclusiveMin ? value > min : value >= min) && (exclusiveMax ? value < max : value <= max);
        };
      }
      case "multipleOf": {
        const isMultiple = multipleOf(expression.divisor);
        return (instance) => ops.typeOf(instance) !== "number" || isMultiple(/** @type number */ (ops.value(instance)));
      }

      case "stringLength": {
        const { min = 0, max = Infinity } = expression;
        return (instance) => {
          if (ops.typeOf(instance) !== "string") {
            return true;
          }
          return codePointLengthIsWithin(/** @type string */ (ops.value(instance)), min, max);
        };
      }
      case "matches": {
        const regExp = new RegExp(expression.pattern, "u");
        return (instance) => ops.typeOf(instance) !== "string" || regExp.test(/** @type string */ (ops.value(instance)));
      }
      case "format": {
        // It annotates every type it passes. It only asserts on the types
        // the format applies to.
        const { name, assert } = expression;
        const format = assert ? definitions.formats[/** @type string */ (expression.uri)] : undefined;
        return (instance) => {
          const type = ops.typeOf(instance);
          if (format !== undefined && type !== undefined && (format.types === undefined || format.types.includes(type)) && !format.validate(ops.value(instance))) {
            return false;
          }
          annotate(info, name);
          return true;
        };
      }

      case "itemCount": {
        const { min = 0, max = Infinity } = expression;
        return (instance) => ops.typeOf(instance) !== "array" || (ops.length(instance) >= min && ops.length(instance) <= max);
      }
      case "uniqueItems":
        return (instance) => {
          if (ops.typeOf(instance) !== "array") {
            return true;
          }

          return unique(ops, [...ops.items(instance)]);
        };
      case "item": {
        const { index } = expression;
        const of = applyTo(expression.of, info);
        return (instance, marks) => {
          if (ops.typeOf(instance) !== "array" || index >= ops.length(instance)) {
            return true;
          } else if (!of(/** @type I */ (ops.get(instance, index)), undefined, index)) {
            return false;
          }
          marks?.add(index);
          return true;
        };
      }
      case "eachItem": {
        const of = applyTo(expression.of, info);
        const unevaluated = "unevaluated" in expression;
        const from = "from" in expression ? expression.from : 0;
        return (instance, marks) => {
          if (ops.typeOf(instance) !== "array") {
            return true;
          }
          let valid = true;
          let index = 0;
          for (const item of ops.items(instance)) {
            if (index >= from && !(unevaluated && /** @type Set<string | number> */ (marks).has(index))) {
              if (of(item, undefined, index)) {
                marks?.add(index);
              } else {
                valid = false;
                if (stopsEarly) {
                  return false;
                }
              }
            }
            index++;
          }
          return valid;
        };
      }
      case "contains": {
        const { min, max } = expression;
        const of = applyTo(expression.of, info);
        return (instance, marks) => {
          if (ops.typeOf(instance) !== "array") {
            return true;
          }
          let matches = 0;
          let index = 0;
          for (const item of ops.items(instance)) {
            if (of(item, undefined, index)) {
              matches++;
              marks?.add(index);
            }
            index++;
          }
          return matches >= min && (max === null || matches <= max);
        };
      }
      case "itemSequence":
        return buildItemSequence(expression.pattern, info);

      case "propertyCount": {
        const { min = 0, max = Infinity } = expression;
        return (instance) => ops.typeOf(instance) !== "object" || (ops.length(instance) >= min && ops.length(instance) <= max);
      }
      case "hasProperty": {
        const { name } = expression;
        return (instance) => ops.typeOf(instance) !== "object" || ops.has(instance, name);
      }
      case "propertyEquals": {
        const { name, value } = expression;
        return (instance) => {
          if (ops.typeOf(instance) !== "object") {
            return true;
          }
          const property = ops.get(instance, name);
          return property !== undefined && equal(property, value);
        };
      }
      case "property":
      case "eachProperty":
        return buildAll([expression], info);
      case "eachPropertyName": {
        // Names are evaluated at the object's instance location
        const of = applyTo(expression.of, info);
        return (instance) => {
          if (ops.typeOf(instance) !== "object") {
            return true;
          }
          let valid = true;
          for (const name of ops.keys(instance)) {
            valid = of(name, undefined) && valid;
          }
          return valid;
        };
      }

      case "annotate": {
        const { value } = expression;
        const types = expression.types && new Set(/** @type TypeName[] */ (expression.types));
        return (instance) => {
          if (types === undefined || hasType(types, ops.typeOf(instance), () => Number.isInteger(ops.value(instance)))) {
            annotate(info, value);
          }
          return true;
        };
      }

      case "predicate": {
        const evaluate = keywordEvaluate(definitions, expression.keyword)(expression.value, { op: "predicate", instance: ops });
        const types = new Set(/** @type TypeName[] */ (expression.types));
        return (instance) => {
          return !hasType(types, ops.typeOf(instance), () => Number.isInteger(ops.value(instance))) || evaluate(instance);
        };
      }
      case "opaque":
        return buildOpaque(expression, info);
    }
  };

  /**
   * An `opaque` operation, through the keyword's evaluator. Its context reads
   * the marks of the evaluation in progress, which are swapped in for each
   * call, so evaluations that nest (a schema that applies itself) each see
   * their own. Schemas it applies have their own hooks, at the instance
   * location of the segment it gives. An expression in `schemas` that isn't
   * `apply` is part of the keyword, like any operation's subexpression.
   *
   * @type (expression: Extract<Expression, { op: "opaque" }>, info: KeywordInfo) => Evaluator<I>
   */
  const buildOpaque = (expression, info) => {
    /** @type Marks */
    let current;

    /** @type (of: Expression) => (instance: I, segment?: string | number) => boolean */
    const subschema = (of) => {
      const onInstance = build(of, info);
      const onChild = applyTo(of, info);
      return (instance, segment) => {
        // Marks on a child are the child's. On the same instance, they're
        // kept only if the schema passes.
        if (segment !== undefined) {
          return onChild(instance, undefined, segment);
        }
        const own = current && new Set(current);
        const valid = onInstance(instance, own);
        if (valid) {
          addAll(current, own);
        }
        return valid;
      };
    };

    /** @type EvaluateContext<I> */
    const context = {
      op: "opaque",
      instance: ops,
      exhaustive: true,
      schemas: expression.schemas.map(subschema),
      markEvaluated: (key) => {
        current?.add(key);
      }
    };
    if (annotating || tracking) {
      context.annotate = (value) => annotate(info, value);
    }
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
   * Every subexpression, in order. Property operations are one loop over the
   * properties, before the rest: a property is checked against the names,
   * then the patterns, then the `except`s.
   *
   * @type (expressions: Expression[], info: KeywordInfo) => Evaluator<I>
   */
  const buildAll = (expressions, info) => {
    /** @type Map<string, SchemaEvaluator<I>[]> */
    const namedLists = new Map();
    /** @type ((name: string) => boolean)[] */
    const selects = [];
    /** @type SchemaEvaluator<I>[] */
    const selected = [];
    /** @type boolean[] */
    const unevaluated = [];
    /** @type Evaluator<I>[] */
    const rest = [];
    /** @type Map<string, Expression[]> */
    const namedOf = new Map();
    for (const expression of expressions) {
      if (expression.op === "property") {
        namedLists.set(expression.name, [...namedLists.get(expression.name) ?? [], applyTo(expression.of, info)]);
        namedOf.set(expression.name, [...namedOf.get(expression.name) ?? [], expression.of]);
      } else if (expression.op === "eachProperty") {
        selects.push(selector(expression.select));
        selected.push(applyTo(expression.of, info));
        unevaluated.push("unevaluated" in expression.select);
      } else {
        rest.push(build(expression, info));
      }
    }

    // A name is usually in one `property`
    /** @type Map<string, SchemaEvaluator<I>> */
    const named = new Map();
    for (const [name, evaluators] of namedLists) {
      if (evaluators.length === 1) {
        named.set(name, evaluators[0]);
        continue;
      }

      named.set(name, (instance, marks, segment) => {
        let valid = true;
        for (let index = 0; index < evaluators.length; index++) {
          valid = evaluators[index](instance, marks, segment) && valid;
        }
        return valid;
      });
    }

    /** @type Evaluator<I> */
    let evaluateRest;
    if (rest.length === 0) {
      evaluateRest = () => true;
    } else if (rest.length === 1) {
      evaluateRest = rest[0];
    } else if (rest.length === 2 && stopsEarly) {
      // Called directly, without a loop, which was faster
      const [a, b] = rest;
      evaluateRest = (instance, marks) => a(instance, marks) && b(instance, marks);
    } else if (rest.length === 2) {
      const [a, b] = rest;
      evaluateRest = (instance, marks) => {
        const valid = a(instance, marks);
        return b(instance, marks) && valid;
      };
    } else if (stopsEarly) {
      evaluateRest = (instance, marks) => {
        for (let index = 0; index < rest.length; index++) {
          if (!rest[index](instance, marks)) {
            return false;
          }
        }
        return true;
      };
    } else {
      evaluateRest = (instance, marks) => {
        let valid = true;
        for (let index = 0; index < rest.length; index++) {
          valid = rest[index](instance, marks) && valid;
        }
        return valid;
      };
    }

    if (named.size === 0 && selected.length === 0) {
      return evaluateRest;
    }

    // With one name, looking it up is the same as looping over the
    // properties, and evaluates in the same order
    if (named.size === 1 && selected.length === 0) {
      const [[name, evaluate]] = named;
      return (instance, marks) => {
        let valid = true;
        if (ops.typeOf(instance) === "object") {
          const value = ops.get(instance, name);
          if (value !== undefined) {
            valid = evaluate(value, undefined, name);
            if (valid) {
              marks?.add(name);
            }
          }
        }
        return evaluateRest(instance, marks) && valid;
      };
    }

    // Without plugins or annotating, a property schema that only checks the
    // type is checked in the loop, with a mask, instead of called, as in
    // `fast.js`. Each name's entry has the same shape, with a mask of 0 if
    // it's called.
    /** @type Map<string, { evaluate: SchemaEvaluator<I>; mask: number }> */
    const entries = new Map();
    for (const [name, evaluate] of named) {
      const of = /** @type Expression[] */ (namedOf.get(name));
      entries.set(name, { evaluate, mask: stopsEarly && of.length === 1 ? typeOnlyMask(of[0]) : 0 });
    }
    const namedTable = nameTable(entries);

    /** @type Evaluator<I> */
    let loop;
    if (selected.length === 0) {
      loop = (instance, marks) => {
        let valid = true;
        const properties = propertiesOf(instance);
        for (let index = 0; index < properties.length; index++) {
          const name = propertyName(properties[index]);
          const value = propertyValue(properties[index]);
          const entry = namedTable[name];
          if (entry !== undefined) {
            if (entry.mask === 0 ? entry.evaluate(value, undefined, name) : isOfType(entry.mask, value)) {
              marks?.add(name);
            } else if (stopsEarly) {
              return false;
            } else {
              valid = false;
            }
          }
        }
        return valid;
      };
    } else {
      loop = (instance, marks) => {
        let valid = true;
        const properties = propertiesOf(instance);
        for (let index = 0; index < properties.length; index++) {
          const name = propertyName(properties[index]);
          const value = propertyValue(properties[index]);
          let evaluated = false;
          let isValid = true;
          const entry = namedTable[name];
          if (entry !== undefined) {
            evaluated = true;
            isValid = entry.mask === 0 ? entry.evaluate(value, undefined, name) : isOfType(entry.mask, value);
          }
          for (let select = 0; select < selected.length; select++) {
            if (unevaluated[select] ? !(/** @type Set<string | number> */ (marks).has(name)) : selects[select](name)) {
              evaluated = true;
              isValid = selected[select](value, undefined, name) && isValid;
            }
          }
          if (evaluated && isValid) {
            marks?.add(name);
          } else if (stopsEarly && !isValid) {
            return false;
          }
          valid &&= isValid;
        }
        return valid;
      };
    }

    if (stopsEarly) {
      return (instance, marks) => evaluateRest(instance, marks) && (ops.typeOf(instance) !== "object" || loop(instance, marks));
    }

    return (instance, marks) => {
      const valid = ops.typeOf(instance) !== "object" || loop(instance, marks);
      return evaluateRest(instance, marks) && valid;
    };
  };

  /**
   * The groups whose expressions are only property operations that don't
   * read marks
   *
   * @type (groups: KeywordGroup[]) => KeywordGroup[]
   */
  const mergeable = (groups) => groups.filter(({ expression }) => {
    /** @type (operation: Expression) => boolean */
    const isPropertyOperation = (operation) => operation.op === "property"
      || (operation.op === "eachProperty" && !("unevaluated" in operation.select));
    return expression.op === "all" ? expression.of.every(isPropertyOperation) : isPropertyOperation(expression);
  });

  /**
   * Find the operations each property is for, in the order the groups' own
   * loops would evaluate them: by property, then by operation. A pattern is
   * tested once, even if several groups have it, and an `except` that's
   * exactly the other groups' names and patterns is "nothing else matched".
   * It also finds which required names the instance has, with a bit for
   * each, so `required` doesn't look each one up again.
   *
   * @type (groups: (readonly [Expression, KeywordInfo])[], bits: Map<string, number>) => (instance: I) => Matches<I>
   */
  const buildMatcher = (groups, bits) => {
    /** @typedef {{ slot: number; evaluate: SchemaEvaluator<I> }} Operation */

    /** @type Map<string, Operation[]> */
    const named = new Map();
    /** @type RegExp[] */
    const regExps = [];
    /** @type (Operation & { test: number })[] */
    const patterns = [];
    /** @type (Operation & { select?: (name: string) => boolean })[] */
    const excepts = [];
    /** @type Set<string> */
    const allNames = new Set();
    /** @type Set<string> */
    const allPatterns = new Set();

    groups.forEach(([expression, info], slot) => {
      for (const operation of expression.op === "all" ? expression.of : [expression]) {
        if (operation.op === "property") {
          named.set(operation.name, [...named.get(operation.name) ?? [], { slot, evaluate: applyTo(operation.of, info) }]);
          allNames.add(operation.name);
        } else if (operation.op === "eachProperty" && "pattern" in operation.select) {
          const { pattern } = operation.select;
          let test = regExps.findIndex((regExp) => regExp.source === new RegExp(pattern, "u").source);
          if (test === -1) {
            test = regExps.push(new RegExp(pattern, "u")) - 1;
          }
          patterns.push({ slot, evaluate: applyTo(operation.of, info), test });
          allPatterns.add(pattern);
        }
      }
    });
    groups.forEach(([expression, info], slot) => {
      for (const operation of expression.op === "all" ? expression.of : [expression]) {
        if (operation.op === "eachProperty" && "except" in operation.select) {
          const { except } = operation.select;
          const isOwn = except.names.length === allNames.size && except.names.every((name) => allNames.has(name))
            && except.patterns.length === allPatterns.size && except.patterns.every((pattern) => allPatterns.has(pattern));
          excepts.push({ slot, evaluate: applyTo(operation.of, info), select: isOwn ? undefined : selector(operation.select) });
        }
      }
    });

    // Each name has its operations and its required bit in one entry, so
    // it's looked up once
    /** @type Map<string, { operations: Operation[]; bit: number }> */
    const entries = new Map();
    for (const [name, operations] of named) {
      entries.set(name, { operations, bit: bits.get(name) ?? 0 });
    }
    for (const [name, bit] of bits) {
      if (!entries.has(name)) {
        entries.set(name, { operations: [], bit });
      }
    }
    const namedTable = nameTable(entries);

    return (instance) => {
      /** @type Matches<I> */
      const matches = [0];
      if (ops.typeOf(instance) !== "object") {
        return matches;
      }

      let found = 0;
      /** @type boolean[] */
      const tested = [];
      for (const [name, value] of ops.entries(instance)) {
        let matched = false;
        const entry = namedTable[name];
        if (entry !== undefined) {
          const byName = entry.operations;
          for (let index = 0; index < byName.length; index++) {
            matches.push(byName[index].slot, name, value, byName[index].evaluate);
          }
          matched = byName.length > 0;
          found |= entry.bit;
        }
        for (let test = 0; test < regExps.length; test++) {
          tested[test] = regExps[test].test(name);
        }
        for (let index = 0; index < patterns.length; index++) {
          const { slot, evaluate, test } = patterns[index];
          if (tested[test]) {
            matches.push(slot, name, value, evaluate);
            matched = true;
          }
        }
        for (let index = 0; index < excepts.length; index++) {
          const { slot, evaluate, select } = excepts[index];
          if (select === undefined ? !matched : select(name)) {
            matches.push(slot, name, value, evaluate);
          }
        }
      }
      matches[0] = found;
      return matches;
    };
  };

  /**
   * Evaluate a group's matches. A name is marked if all of its matches pass.
   *
   * @type (matches: Matches<I>, slot: number, marks: Marks) => boolean
   */
  const evaluateMatches = (matches, slot, marks) => {
    let valid = true;
    /** @type Set<string> | undefined */
    let failed;
    for (let index = 1; index < matches.length; index += 4) {
      if (matches[index] !== slot) {
        continue;
      }

      const name = /** @type string */ (matches[index + 1]);
      const evaluate = /** @type SchemaEvaluator<I> */ (matches[index + 3]);
      if (evaluate(/** @type I */ (matches[index + 2]), undefined, name)) {
        if (marks !== undefined && !failed?.has(name)) {
          marks.add(name);
        }
      } else {
        valid = false;
        marks?.delete(name);
        (failed ??= new Set()).add(name);
      }
    }
    return valid;
  };

  /**
   * The items, in order, have to match the pattern. It's an NFA built from
   * the pattern's tree.
   *
   * @type (pattern: ItemPattern, info: KeywordInfo) => Evaluator<I>
   */
  const buildItemSequence = (pattern, info) => {
    const { states, start, end } = itemSequenceStates(pattern, (of) => applyTo(of, info));

    return (instance, marks) => {
      if (ops.typeOf(instance) !== "array") {
        return true;
      }

      /** @type Set<number> */
      let current = new Set();
      addReachable(states, start, current);
      let index = 0;
      for (const item of ops.items(instance)) {
        /** @type Set<number> */
        const next = new Set();
        for (const state of current) {
          const { evaluate } = states[state];
          if (evaluate !== undefined && evaluate(item, undefined, index)) {
            addReachable(states, /** @type number */ (states[state].next), next);
          }
        }
        current = next;
        if (current.size === 0) {
          return false;
        }
        index++;
      }

      if (!current.has(end)) {
        return false;
      }
      for (let item = 0; item < index; item++) {
        marks?.add(item);
      }
      return true;
    };
  };

  const root = schema(kernel.uri);

  return (instance, callPlugins = []) => {
    const outerPlugin = plugin;
    const outerKeywordState = keywordState;
    const outerSchemaState = schemaState;
    const outerInstance = currentInstance;
    const outerAt = currentAt;
    const outerResource = currentResource;
    const outerAnchors = dynamicAnchors;
    const outerAnnotations = annotations;

    // Several plugins are combined into one, so evaluating with one plugin,
    // which is the usual case, doesn't loop or keep arrays of states
    plugin = callPlugins.length === 0 ? noPlugin : callPlugins.length === 1 ? callPlugins[0] : combinePlugins(callPlugins);
    keywordState = undefined;
    schemaState = undefined;
    currentInstance = undefined;
    currentAt = undefined;
    currentResource = undefined;
    dynamicAnchors = undefined;
    annotations = [];

    try {
      const valid = root(instance, undefined);
      if (valid) {
        attachAnnotations(annotations);
      }

      return valid;
    } finally {
      plugin = outerPlugin;
      keywordState = outerKeywordState;
      schemaState = outerSchemaState;
      currentInstance = outerInstance;
      currentAt = outerAt;
      currentResource = outerResource;
      dynamicAnchors = outerAnchors;
      annotations = outerAnnotations;
    }
  };
};

/**
 * Where in the instance a hook is called. Every schema and keyword evaluated
 * on the same instance gets the same location, so one is created for each
 * value evaluated rather than for each hook call. `value` is a method rather
 * than a closure, so a location is one allocation. It's one class for every
 * evaluator, so hooks always see the same shape.
 *
 * `instanceLocation` is worked out from the parent's the first time it's
 * read, because building a JSON Pointer for every schema evaluated on a
 * child was 13–25% of evaluating with plugins, and most plugins only read it
 * for a few hook calls, like the ones for an error.
 *
 * @implements EvaluationLocation
 */
class Location {
  /** @type Location | undefined */
  #parent;

  /** @type string | number | undefined */
  #segment;

  /** @type string | undefined */
  #instanceLocation;

  /** @type unknown */
  #instance;

  /** @type InstanceOps<any> */
  #ops;

  /**
   * @param {Location | undefined} parent
   * @param {string | number | undefined} segment
   * @param {EvaluationLocation["node"]} node
   * @param {unknown} instance
   * @param {InstanceOps<any>} ops
   */
  constructor(parent, segment, node, instance, ops) {
    this.#parent = parent;
    this.#segment = segment;
    this.node = node;
    this.#instance = instance;
    this.#ops = ops;
  }

  /** @returns {string} */
  get instanceLocation() {
    if (this.#instanceLocation === undefined) {
      const parent = this.#parent?.instanceLocation ?? "";
      const segment = this.#segment;
      // Indexes don't need to be escaped
      if (segment === undefined) {
        this.#instanceLocation = parent;
      } else {
        this.#instanceLocation = typeof segment === "number" ? `${parent}/${segment}` : JsonPointer.append(segment, parent);
      }
    }
    return this.#instanceLocation;
  }

  value() {
    return this.#ops.typeOf(this.#instance) === undefined ? undefined : this.#ops.value(this.#instance);
  }
}

/**
 * Plugins that act as one. Each hook's state is an array of the plugins'
 * states.
 *
 * @type (plugins: EvaluationPlugin[]) => EvaluationPlugin<unknown[], unknown[]>
 */
const combinePlugins = (plugins) => ({
  beforeSchema: (schema, at, parent) => plugins.map((plugin, index) => plugin.beforeSchema?.(schema, at, parent?.[index])),
  afterSchema: (schema, at, valid, state, parent) => {
    for (let index = 0; index < plugins.length; index++) {
      plugins[index].afterSchema?.(schema, at, valid, state[index], parent?.[index]);
    }
  },
  beforeKeyword: (keyword, at, schema) => plugins.map((plugin, index) => plugin.beforeKeyword?.(keyword, at, schema[index])),
  afterKeyword: (keyword, at, valid, state, schema) => {
    for (let index = 0; index < plugins.length; index++) {
      plugins[index].afterKeyword?.(keyword, at, valid, state[index], schema[index]);
    }
  },
  annotation: (keyword, at, value, state) => {
    for (let index = 0; index < plugins.length; index++) {
      plugins[index].annotation?.(keyword, at, value, state[index]);
    }
  }
});

/**
 * How an expression whose marks are kept only if it passes gets its own:
 * none if it can't mark anything, an empty set if it marks but doesn't read
 * marks, and a copy of what's marked so far if it reads them
 *
 * @typedef {0 | 1 | 2} MarksMode
 */
const NONE = 0;
const EMPTY = 1;
const COPY = 2;

/** @type (mode: MarksMode, marks: Set<string | number>) => Marks */
const startMarks = (mode, marks) => {
  if (mode === NONE) {
    return undefined;
  }
  return mode === EMPTY ? new Set() : new Set(marks);
};

/** @type (marks: Marks, more: Marks) => void */
const addAll = (marks, more) => {
  if (marks !== undefined && more !== undefined) {
    for (const key of more) {
      marks.add(key);
    }
  }
};

/** @type (types: ReadonlySet<string>, type: string | undefined, isInteger: () => boolean) => boolean */
const hasType = (types, type, isInteger) => {
  return type !== undefined && (types.has(type) || (type === "number" && types.has("integer") && isInteger()));
};

/**
 * Whether an array's items are unique, as in `fast.js`. Short arrays
 * compare every pair. In longer ones, scalars are looked up in a set,
 * arrays are compared with the arrays of the same length, and objects with
 * the objects with the same value of one property (the first object's
 * first). An item that couldn't be parsed, or that has parts that couldn't
 * be, isn't a duplicate of anything.
 *
 * @template I
 * @param {InstanceOps<I>} ops
 * @param {I[]} items
 * @returns {boolean}
 */
const unique = (ops, items) => {
  if (items.length < 8) {
    for (let i = 1; i < items.length; i++) {
      for (let j = 0; j < i; j++) {
        if (instanceEqual(ops, items[j], ops, items[i], false)) {
          return false;
        }
      }
    }
    return true;
  }

  /** @type Set<unknown> */
  const scalars = new Set();
  /** @type Map<number, unknown[]> */
  const arrays = new Map();
  /** @type Map<unknown, unknown[]> */
  const objects = new Map();
  /** @type string | undefined */
  let probe;
  for (const item of items) {
    const type = ops.typeOf(item);
    /** @type unknown[] | undefined */
    let bucket;
    if (type === undefined) {
      continue;
    } else if (type === "array") {
      const length = ops.length(item);
      bucket = arrays.get(length);
      if (bucket === undefined) {
        bucket = [];
        arrays.set(length, bucket);
      }
    } else if (type === "object") {
      if (probe === undefined) {
        for (const [name] of ops.entries(item)) {
          probe = name;
          break;
        }
      }
      // Objects whose value is an array or object, or couldn't be parsed,
      // share a bucket
      const value = probe === undefined ? undefined : ops.get(item, probe);
      const valueType = value === undefined ? undefined : ops.typeOf(value);
      /** @type unknown */
      let key;
      if (value !== undefined) {
        key = valueType === undefined || valueType === "array" || valueType === "object" ? objects : ops.value(value);
      }
      bucket = objects.get(key);
      if (bucket === undefined) {
        bucket = [];
        objects.set(key, bucket);
      }
    } else {
      const value = ops.value(item);
      if (scalars.has(value)) {
        return false;
      }
      scalars.add(value);
      continue;
    }

    for (let index = 0; index < bucket.length; index++) {
      if (instanceEqual(ops, /** @type I */ (bucket[index]), ops, item, false)) {
        return false;
      }
    }
    bucket.push(item);
  }
  return true;
};

/**
 * The names a group of only `hasProperty`s requires, or undefined if it's
 * something else
 *
 * @type (expression: Expression) => string[] | undefined
 */
const requiredNames = (expression) => {
  const operations = expression.op === "all" ? expression.of : [expression];
  return operations.length > 0 && operations.every((operation) => operation.op === "hasProperty")
    ? operations.map((operation) => /** @type {{ name: string }} */ (operation).name)
    : undefined;
};

/**
 * A bit for each name that a schema's groups of only `hasProperty`s
 * (`required`) require, for the property matcher to set when the instance
 * has it. There are bits for up to 30 names, so a 31st and later aren't
 * looked up this way.
 *
 * @type (groups: KeywordGroup[]) => Map<string, number>
 */
const requiredBits = (groups) => {
  /** @type Map<string, number> */
  const bits = new Map();
  for (const { expression } of groups) {
    for (const name of requiredNames(expression) ?? []) {
      if (!bits.has(name) && bits.size < 30) {
        bits.set(name, 1 << bits.size);
      }
    }
  }
  return bits;
};

/**
 * The bits of a group's required names, or 0 if it's not only
 * `hasProperty`s or one of its names doesn't have a bit
 *
 * @type (expression: Expression, bits: Map<string, number>) => number
 */
const requiredMask = (expression, bits) => {
  let mask = 0;
  for (const name of requiredNames(expression) ?? []) {
    const bit = bits.get(name);
    if (bit === undefined) {
      return 0;
    }
    mask |= bit;
  }
  return mask;
};

/**
 * A table to look property names up in, as an object without a prototype,
 * which was faster than a `Map` (FLAG 11–23% on real schemas). No name is
 * inherited, not even `__proto__` or `constructor`.
 *
 * @type <T>(map: Map<string, T>) => Record<string, T | undefined>
 */
const nameTable = (map) => {
  /** @type Record<string, any> */
  const table = Object.create(null);
  for (const [name, value] of map) {
    table[name] = value;
  }
  return table;
};

/** @type (annotations: Annotations) => void */
const attachAnnotations = (annotations) => {
  for (let index = 0; index < annotations.length; index += 3) {
    const node = /** @type Node */ (annotations[index]);
    const keywordUri = /** @type string */ (annotations[index + 1]);
    /** @type Data */
    const data = node.data ??= {};
    data.annotations ??= new Map();
    let values = data.annotations.get(keywordUri);
    if (values === undefined) {
      values = [];
      data.annotations.set(keywordUri, values);
    }
    values.push(/** @type Json */ (annotations[index + 2]));
  }
};
