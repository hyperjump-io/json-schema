import { keywordEvaluate } from "../kernel/definitions.js";
import { addReachable, isClose, itemSequenceStates, selector } from "../kernel/fast.js";
import { astInstance, jsInstance } from "../kernel/instance.js";
import { readsMarks } from "../kernel/kernel.js";
import { codePointLengthIsWithin, instanceEqual } from "../keywords/utilities.js";
import { schemaAt } from "./document.js";

/**
 * @import { Json, JsonType } from "@hyperjump/browser"
 * @import { Expression, ExpressionOf, Handle, ItemPattern, Selector } from "../kernel/kernel.d.ts"
 * @import { State } from "../kernel/fast.js"
 * @import { InstanceNode } from "../kernel/instance.js"
 * @import { JsonSchemaNode } from "../schema/schema-ast.d.ts"
 * @import { LintDocument } from "./document.d.ts"
 * @import { LoweredKeyword } from "./lower.d.ts"
 * @import * as API from "./evaluate.d.ts"
 */

/**
 * The properties or items marked so far: the ones that are marked if the
 * expressions that marked them pass, the ones that might be, and whether
 * something whose marks aren't known might have marked any of them
 *
 * @typedef {{ sure: Set<string | number>; maybe: Set<string | number>; anything: boolean }} Marks
 */

/**
 * Pass (true), fail (false), or unknown (undefined), and whether it might
 * annotate. Something that fails doesn't annotate, because its annotations
 * are dropped.
 *
 * @typedef {{ valid: boolean | undefined; annotates: boolean }} Outcome
 */

/** @type Outcome */
const pass = { valid: true, annotates: false };
/** @type Outcome */
const fail = { valid: false, annotates: false };
/** @type Outcome */
const unknown = { valid: undefined, annotates: true };

/**
 * Evaluators, by document
 *
 * @type WeakMap<LintDocument, API.LintEvaluator>
 */
const cache = new WeakMap();

/** @type API.evaluatorForLint */
export const evaluatorForLint = (document) => {
  let evaluator = cache.get(document);
  if (evaluator === undefined) {
    evaluator = buildEvaluator(document);
    cache.set(document, evaluator);
  }

  return evaluator;
};

/** @type (valid: boolean | undefined, annotates: boolean) => Outcome */
const outcome = (valid, annotates) => ({ valid, annotates: annotates && valid !== false });

/** @type (a: boolean | undefined, b: boolean | undefined) => boolean | undefined */
const and = (a, b) => a === false || b === false ? false : a === undefined || b === undefined ? undefined : true;

/**
 * Whether the number of things that pass is within limits, when `unknowns`
 * more might
 *
 * @type (passed: number, unknowns: number, min: number, max: number | null) => boolean | undefined
 */
const countWithin = (passed, unknowns, min, max) => {
  if (passed + unknowns < min || (max !== null && passed > max)) {
    return false;
  } else if (passed >= min && (max === null || passed + unknowns <= max)) {
    return true;
  }
  return undefined;
};

/** @type () => Marks */
const noMarks = () => ({ sure: new Set(), maybe: new Set(), anything: false });

/** @type (marks: Marks) => Marks */
const copyMarks = (marks) => ({ sure: new Set(marks.sure), maybe: new Set(marks.maybe), anything: marks.anything });

/**
 * Keep the marks of something on the same instance: as they are if it
 * passes, as marks that might be there if that isn't known, and none if it
 * fails
 *
 * @type (from: Marks, to: Marks, valid: boolean | undefined) => void
 */
const keepMarks = (from, to, valid) => {
  if (valid === true) {
    from.sure.forEach((key) => to.sure.add(key));
    from.maybe.forEach((key) => to.maybe.add(key));
    to.anything ||= from.anything;
  } else if (valid === undefined) {
    from.sure.forEach((key) => to.maybe.add(key));
    from.maybe.forEach((key) => to.maybe.add(key));
    to.anything ||= from.anything;
  }
};

/** @type (marks: Marks, key: string | number, valid: boolean | undefined) => void */
const mark = (marks, key, valid) => {
  if (valid === true) {
    marks.sure.add(key);
  } else if (valid === undefined) {
    marks.maybe.add(key);
  }
};

/** @type (marks: Marks) => number */
const markCount = (marks) => marks.sure.size + marks.maybe.size + (marks.anything ? 1 : 0);

/** @type (types: ReadonlySet<string>, instance: InstanceNode) => boolean */
const hasType = (types, instance) => {
  const type = /** @type JsonType */ (astInstance.typeOf(instance));
  return types.has(type) || (type === "number" && types.has("integer") && Number.isInteger(astInstance.value(instance)));
};

/** @type (instance: InstanceNode) => InstanceNode[] */
const itemsOf = (instance) => [...astInstance.items(instance)];

/** @type (instance: InstanceNode, value: Json) => boolean */
const equal = (instance, value) => instanceEqual(astInstance, instance, jsInstance, value, true);

/**
 * A group that reads marks is evaluated after the groups that don't
 *
 * @type (keywords: LoweredKeyword[]) => LoweredKeyword[]
 */
const evaluationOrder = (keywords) => [
  ...keywords.filter(({ group }) => !readsMarks(group.expression)),
  ...keywords.filter(({ group }) => readsMarks(group.expression))
];

/**
 * Everything evaluating needs is in the document, so evaluating is
 * synchronous: what every schema the document can apply lowers to, and the
 * schema each handle is, a subschema by its location, or what a reference
 * finds.
 *
 * @type (document: LintDocument) => API.LintEvaluator
 */
const buildEvaluator = (document) => {
  const { reached: lowered, definitions } = document;

  /** @type Map<JsonSchemaNode, LoweredKeyword[]> */
  const ordered = new Map();
  /** @type (schemaNode: JsonSchemaNode) => LoweredKeyword[] | undefined */
  const orderedKeywords = (schemaNode) => {
    let keywords = ordered.get(schemaNode);
    if (keywords === undefined) {
      const unordered = lowered.get(schemaNode);
      if (unordered === undefined) {
        return;
      }
      keywords = evaluationOrder(unordered);
      ordered.set(schemaNode, keywords);
    }
    return keywords;
  };

  // A schema being evaluated on an instance it's already being evaluated
  // on would never finish, so that's unknown
  /** @type Map<JsonSchemaNode, Set<InstanceNode>> */
  const inProgress = new Map();

  /** @type (marks: Marks) => Outcome */
  const unknownApplied = (marks) => {
    marks.anything = true;
    return unknown;
  };

  /** @type (schemaNode: JsonSchemaNode | undefined, instance: InstanceNode, marks: Marks) => Outcome */
  const evaluateSchema = (schemaNode, instance, marks) => {
    if (astInstance.typeOf(instance) === undefined) {
      return pass;
    } else if (schemaNode === undefined) {
      return unknownApplied(marks);
    } else if (schemaNode.type === "reference") {
      return applyIn(schemaNode, instance, marks, () => evaluateSchema(schemaAt(document, /** @type string */ (schemaNode.href)), instance, marks));
    } else if (schemaNode.jsonType === "boolean") {
      return schemaNode.value ? pass : fail;
    }

    const keywords = orderedKeywords(schemaNode);
    if (keywords === undefined) {
      return unknownApplied(marks);
    }

    return applyIn(schemaNode, instance, marks, () => {
      const own = noMarks();
      /** @type boolean | undefined */
      let valid = true;
      let annotates = false;
      for (const { group } of keywords) {
        const result = evaluate(group.expression, instance, own);
        valid = and(valid, result.valid);
        annotates ||= result.annotates;
        if (valid === false) {
          break;
        }
      }
      keepMarks(own, marks, valid);
      return outcome(valid, annotates);
    });
  };

  /** @type (schemaNode: JsonSchemaNode, instance: InstanceNode, marks: Marks, evaluateIt: () => Outcome) => Outcome */
  const applyIn = (schemaNode, instance, marks, evaluateIt) => {
    let instances = inProgress.get(schemaNode);
    if (instances === undefined) {
      instances = new Set();
      inProgress.set(schemaNode, instances);
    }
    if (instances.has(instance)) {
      return unknownApplied(marks);
    }

    instances.add(instance);
    try {
      return evaluateIt();
    } finally {
      instances.delete(instance);
    }
  };

  /** @type (of: Expression, instance: InstanceNode) => Outcome */
  const evaluateChild = (of, instance) => evaluate(of, instance, noMarks());

  /** @type (expression: Expression, instance: InstanceNode, marks: Marks) => Outcome */
  const evaluate = (expression, instance, marks) => {
    const type = astInstance.typeOf(instance);
    if (type === undefined) {
      // A value that couldn't be parsed passes
      return pass;
    }

    switch (expression.op) {
      case "pass":
        return pass;
      case "fail":
        return fail;
      case "all": {
        /** @type boolean | undefined */
        let valid = true;
        let annotates = false;
        for (const of of expression.of) {
          const result = evaluate(of, instance, marks);
          valid = and(valid, result.valid);
          annotates ||= result.annotates;
          if (valid === false) {
            break;
          }
        }
        return outcome(valid, annotates);
      }
      case "any": {
        /** @type boolean | undefined */
        let valid = false;
        let annotates = false;
        for (const of of expression.of) {
          const own = noMarks();
          const result = evaluate(of, instance, own);
          keepMarks(own, marks, result.valid);
          if (result.valid === true) {
            valid = true;
          } else if (result.valid === undefined && valid === false) {
            valid = undefined;
          }
          annotates ||= result.annotates;
        }
        return outcome(valid, annotates);
      }
      case "one": {
        let passed = 0;
        let unknowns = 0;
        let annotates = false;
        /** @type [Marks, boolean | undefined][] */
        const branches = [];
        for (const of of expression.of) {
          const own = noMarks();
          const result = evaluate(of, instance, own);
          if (result.valid === true) {
            passed++;
          } else if (result.valid === undefined) {
            unknowns++;
          }
          branches.push([own, result.valid]);
          annotates ||= result.annotates;
        }

        const valid = countWithin(passed, unknowns, 1, 1);
        if (valid !== false) {
          for (const [own, branchValid] of branches) {
            keepMarks(own, marks, valid === undefined && branchValid === true ? undefined : branchValid);
          }
        }
        return outcome(valid, annotates);
      }
      case "not": {
        const { valid } = evaluate(expression.of, instance, noMarks());
        return outcome(valid === undefined ? undefined : !valid, false);
      }
      case "cases":
        return evaluateCases(expression, 0, instance, marks);
      case "typeSwitch":
        return evaluate(expression.cases[type] ?? expression.otherwise, instance, marks);
      case "propertySwitch": {
        if (type !== "object") {
          return pass;
        }
        const value = /** @type InstanceNode | undefined */ (astInstance.get(instance, expression.name));
        if (value === undefined) {
          return evaluate(expression.absent, instance, marks);
        }
        const valueType = astInstance.typeOf(value);
        if (valueType === undefined) {
          return evaluate(expression.unparsed, instance, marks);
        }
        const scalar = valueType === "object" || valueType === "array" ? undefined : astInstance.value(value);
        const branch = expression.cases.find(([caseValue]) => caseValue === scalar)?.[1] ?? expression.other;
        return evaluate(branch, instance, marks);
      }
      case "keySwitch": {
        if (type !== "object") {
          return pass;
        }
        let has = false;
        for (const [name, then] of expression.cases) {
          const value = /** @type InstanceNode | undefined */ (astInstance.get(instance, name));
          if (value !== undefined) {
            if (astInstance.typeOf(value) !== undefined) {
              return evaluate(then, instance, marks);
            }
            has = true;
          }
        }
        return evaluate(has ? expression.unparsed : expression.none, instance, marks);
      }
      case "apply":
        return evaluateSchema(schemaAt(document, expression.schema), instance, marks);
      // Only optimizations make it, and lint doesn't optimize
      case "inline":
        return evaluate({ op: "all", of: expression.keywords.map((group) => group.expression) }, instance, marks);
      case "dynamicApply":
        // Which schema it applies depends on the dynamic scope, which depends
        // on what applies the schema it's in
        return unknownApplied(marks);

      case "typeIs":
        return hasType(new Set(expression.types), instance) ? pass : fail;
      case "equals":
        return equal(instance, expression.value) ? pass : fail;
      case "oneOfValues":
        return expression.values.some((value) => equal(instance, value)) ? pass : fail;

      case "range": {
        if (type !== "number") {
          return pass;
        }
        const { min = -Infinity, max = Infinity, exclusiveMin = false, exclusiveMax = false } = expression;
        const value = /** @type number */ (astInstance.value(instance));
        return (exclusiveMin ? value > min : value >= min) && (exclusiveMax ? value < max : value <= max) ? pass : fail;
      }
      case "multipleOf": {
        if (type !== "number") {
          return pass;
        }
        const remainder = /** @type number */ (astInstance.value(instance)) % expression.divisor;
        return isClose(remainder, 0) || isClose(remainder, expression.divisor) ? pass : fail;
      }

      case "stringLength": {
        if (type !== "string") {
          return pass;
        }
        const { min = 0, max = Infinity } = expression;
        return codePointLengthIsWithin(/** @type string */ (astInstance.value(instance)), min, max) ? pass : fail;
      }
      case "matches":
        return type !== "string" || regExp(expression.pattern).test(/** @type string */ (astInstance.value(instance))) ? pass : fail;
      case "format": {
        // It annotates every type, and only asserts on the format's types
        const format = expression.assert ? definitions.formats[/** @type string */ (expression.uri)] : undefined;
        if (expression.assert && format === undefined) {
          return unknown;
        } else if (format !== undefined && (format.types === undefined || format.types.includes(type)) && !format.validate(astInstance.value(instance))) {
          return fail;
        }
        return outcome(true, true);
      }

      case "itemCount": {
        if (type !== "array") {
          return pass;
        }
        const { min = 0, max = Infinity } = expression;
        const length = astInstance.length(instance);
        return length >= min && length <= max ? pass : fail;
      }
      case "uniqueItems": {
        if (type !== "array") {
          return pass;
        }
        const items = itemsOf(instance);
        for (let i = 1; i < items.length; i++) {
          for (let j = 0; j < i; j++) {
            if (instanceEqual(astInstance, items[j], astInstance, items[i], false)) {
              return fail;
            }
          }
        }
        return pass;
      }
      case "item": {
        if (type !== "array" || expression.index >= astInstance.length(instance)) {
          return pass;
        }
        const result = evaluateChild(expression.of, /** @type InstanceNode */ (astInstance.get(instance, expression.index)));
        mark(marks, expression.index, result.valid);
        return result;
      }
      case "eachItem": {
        if (type !== "array") {
          return pass;
        }
        const unevaluated = "unevaluated" in expression;
        const from = "from" in expression ? expression.from : 0;
        const items = itemsOf(instance);
        return each(items.map((item, index) => /** @type const */ ([index, item])).slice(from), marks, unevaluated, expression.of);
      }
      case "contains": {
        if (type !== "array") {
          return pass;
        }
        let passed = 0;
        let unknowns = 0;
        let annotates = false;
        itemsOf(instance).forEach((item, index) => {
          const result = evaluateChild(expression.of, item);
          if (result.valid === true) {
            passed++;
          } else if (result.valid === undefined) {
            unknowns++;
          }
          mark(marks, index, result.valid);
          annotates ||= result.annotates;
        });

        return outcome(countWithin(passed, unknowns, expression.min, expression.max), annotates);
      }
      case "itemSequence":
        return type === "array" ? evaluateItemSequence(expression.pattern, instance, marks) : pass;

      case "propertyCount": {
        if (type !== "object") {
          return pass;
        }
        const { min = 0, max = Infinity } = expression;
        const count = astInstance.length(instance);
        return count >= min && count <= max ? pass : fail;
      }
      case "hasProperty":
        return type !== "object" || astInstance.has(instance, expression.name) ? pass : fail;
      case "propertyEquals": {
        if (type !== "object") {
          return pass;
        }
        const value = /** @type InstanceNode | undefined */ (astInstance.get(instance, expression.name));
        return value !== undefined && equal(value, expression.value) ? pass : fail;
      }
      case "property": {
        const value = type === "object" ? /** @type InstanceNode | undefined */ (astInstance.get(instance, expression.name)) : undefined;
        if (value === undefined) {
          return pass;
        }
        const result = evaluateChild(expression.of, value);
        mark(marks, expression.name, result.valid);
        return result;
      }
      case "eachProperty": {
        if (type !== "object") {
          return pass;
        }
        const unevaluated = "unevaluated" in expression.select;
        const selected = select(expression.select);
        const properties = [...astInstance.entries(instance)].filter(([name]) => unevaluated || selected(name));
        return each(properties, marks, unevaluated, expression.of);
      }
      case "eachPropertyName": {
        if (type !== "object") {
          return pass;
        }
        /** @type boolean | undefined */
        let valid = true;
        let annotates = false;
        for (const name of astInstance.keys(instance)) {
          const result = evaluateChild(expression.of, name);
          valid = and(valid, result.valid);
          annotates ||= result.annotates;
        }
        return outcome(valid, annotates);
      }

      case "annotate":
        return expression.types === undefined || hasType(new Set(expression.types), instance) ? outcome(true, true) : pass;

      case "predicate": {
        if (!hasType(new Set(expression.types), instance)) {
          return pass;
        }
        try {
          return predicate(expression)(instance) ? pass : fail;
        } catch {
          return unknown;
        }
      }
      case "opaque":
        return unknownApplied(marks);
    }
  };

  /**
   * Every one of `children` passes `of`. With `unevaluated`, the ones that
   * aren't marked yet, so one that might be marked can only make it fail
   * if it is.
   *
   * @type (children: (readonly [string | number, InstanceNode])[], marks: Marks, unevaluated: boolean, of: Expression) => Outcome
   */
  const each = (children, marks, unevaluated, of) => {
    /** @type boolean | undefined */
    let valid = true;
    let annotates = false;
    for (const [key, child] of children) {
      if (unevaluated && marks.sure.has(key)) {
        continue;
      }

      const result = evaluateChild(of, child);
      const mightBeMarked = unevaluated && (marks.anything || marks.maybe.has(key));
      const childValid = mightBeMarked && result.valid === false ? undefined : result.valid;
      valid = and(valid, childValid);
      annotates ||= result.annotates;
      mark(marks, key, mightBeMarked && result.valid !== true ? undefined : result.valid);
      if (valid === false) {
        break;
      }
    }
    return outcome(valid, annotates);
  };

  /**
   * The first case whose condition passes applies its branch. If whether a
   * condition passes isn't known, it's known only if both ways agree.
   *
   * @type (expression: ExpressionOf<"cases">, index: number, instance: InstanceNode, marks: Marks) => Outcome
   */
  const evaluateCases = (expression, index, instance, marks) => {
    if (index === expression.cases.length) {
      return expression.otherwise === null ? pass : evaluate(expression.otherwise, instance, marks);
    }

    const [condition, then] = expression.cases[index];
    const own = noMarks();
    const conditionResult = evaluate(condition, instance, own);
    if (conditionResult.valid === false) {
      return evaluateCases(expression, index + 1, instance, marks);
    } else if (conditionResult.valid === true) {
      keepMarks(own, marks, true);
      const result = then === null ? pass : evaluate(then, instance, marks);
      return outcome(result.valid, conditionResult.annotates || result.annotates);
    }

    const thenMarks = copyMarks(own);
    const thenResult = then === null ? pass : evaluate(then, instance, thenMarks);
    const restMarks = noMarks();
    const restResult = evaluateCases(expression, index + 1, instance, restMarks);
    keepMarks(thenMarks, marks, undefined);
    keepMarks(restMarks, marks, undefined);
    const valid = thenResult.valid === restResult.valid ? thenResult.valid : undefined;
    return outcome(valid, conditionResult.annotates || thenResult.annotates || restResult.annotates);
  };

  /**
   * The items have to match the pattern. The NFA keeps the states it's sure
   * to be in and the ones it might be in, since whether an item passes
   * might not be known.
   *
   * @type (pattern: ItemPattern, instance: InstanceNode, marks: Marks) => Outcome
   */
  const evaluateItemSequence = (pattern, instance, marks) => {
    const { states, start, end } = itemStates(pattern);

    /** @type Set<number> */
    let sure = new Set();
    /** @type Set<number> */
    let possible = new Set();
    addReachable(states, start, sure);
    addReachable(states, start, possible);
    let annotates = false;
    const items = itemsOf(instance);
    for (const item of items) {
      /** @type Set<number> */
      const nextSure = new Set();
      /** @type Set<number> */
      const nextPossible = new Set();
      for (const state of possible) {
        const { evaluate: of, next } = states[state];
        if (of === undefined) {
          continue;
        }
        const result = evaluateChild(of, item);
        if (result.valid !== false) {
          addReachable(states, /** @type number */ (next), nextPossible);
          annotates ||= result.annotates;
        }
        if (result.valid === true && sure.has(state)) {
          addReachable(states, /** @type number */ (next), nextSure);
        }
      }
      sure = nextSure;
      possible = nextPossible;
      if (possible.size === 0) {
        return fail;
      }
    }

    const valid = sure.has(end) ? true : possible.has(end) ? undefined : false;
    for (let index = 0; index < items.length; index++) {
      mark(marks, index, valid);
    }
    return outcome(valid, annotates);
  };

  /** @type Map<string, RegExp> */
  const regExps = new Map();
  /** @type (pattern: string) => RegExp */
  const regExp = (pattern) => {
    let compiled = regExps.get(pattern);
    if (compiled === undefined) {
      compiled = new RegExp(pattern, "u");
      regExps.set(pattern, compiled);
    }
    return compiled;
  };

  /** @type WeakMap<Selector, (name: string) => boolean> */
  const selectors = new WeakMap();
  /** @type (select: Selector) => (name: string) => boolean */
  const select = (select) => {
    let selected = selectors.get(select);
    if (selected === undefined) {
      selected = selector(select);
      selectors.set(select, selected);
    }
    return selected;
  };

  /** @type WeakMap<ItemPattern, { states: State<Expression>[]; start: number; end: number }> */
  const itemPatterns = new WeakMap();
  /** @type (pattern: ItemPattern) => { states: State<Expression>[]; start: number; end: number } */
  const itemStates = (pattern) => {
    let nfa = itemPatterns.get(pattern);
    if (nfa === undefined) {
      nfa = itemSequenceStates(pattern, (of) => of);
      itemPatterns.set(pattern, nfa);
    }
    return nfa;
  };

  /** @type WeakMap<Expression, (instance: InstanceNode) => boolean> */
  const predicates = new WeakMap();
  /** @type (expression: ExpressionOf<"predicate">) => (instance: InstanceNode) => boolean */
  const predicate = (expression) => {
    let evaluatePredicate = predicates.get(expression);
    if (evaluatePredicate === undefined) {
      evaluatePredicate = keywordEvaluate(definitions, expression.keyword)(expression.value, { op: "predicate", instance: astInstance });
      predicates.set(expression, evaluatePredicate);
    }
    return evaluatePredicate;
  };

  return {
    schema: (schemaNode, instance) => {
      const marks = noMarks();
      const { valid, annotates } = evaluateSchema(schemaNode, /** @type InstanceNode */ (instance), marks);
      return { valid, annotates, marks: markCount(marks) > 0 };
    },

    keywords: (schemaNode, instance) => {
      const keywords = orderedKeywords(schemaNode) ?? [];
      const own = noMarks();
      /** @type Map<LoweredKeyword, API.LintEvaluation> */
      const evaluations = new Map();
      for (const keyword of keywords) {
        const before = markCount(own);
        const { valid, annotates } = evaluate(keyword.group.expression, /** @type InstanceNode */ (instance), own);
        evaluations.set(keyword, { valid, annotates, marks: markCount(own) > before });
      }

      return (lowered.get(schemaNode) ?? []).map((keyword) => [keyword, /** @type API.LintEvaluation */ (evaluations.get(keyword))]);
    }
  };
};
