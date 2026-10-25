import { subexpressions } from "../kernel.js";

/**
 * @import { CompiledSchema, Expression, Handle, KeywordGroup } from "../kernel.d.ts"
 * @import { Optimization } from "../optimize.js"
 */

/**
 * What a schema marks whenever it passes. Properties are `names`, the names
 * matching `patterns`, and every name `excepts` select. Items are `items`
 * and the ones from `from` on. `all` is every property or item.
 *
 * @typedef {{
 *   all: boolean;
 *   names: Set<string>;
 *   patterns: Set<string>;
 *   excepts: { names: string[]; patterns: string[] }[];
 *   items: Set<number>;
 *   from: number;
 * }} Marks
 */

/**
 * Replace an `unevaluated` selector with one that doesn't read marks, where
 * what the other groups in its schema mark is known without the instance.
 * `eachProperty({ unevaluated })` selects the names they don't mark
 * (`except`), and `eachItem({ unevaluated })` starts after their prefix. One
 * whose siblings mark everything is `pass`. When nothing reads marks, the
 * evaluators don't track them, which is much faster.
 *
 * What's marked is known from the operations, without rules for keywords.
 * Operations that apply a schema only under some condition (`any`, `one`,
 * `cases`) only count if nothing they apply marks anything. `contains`,
 * `dynamicApply`, and `opaque` are never known. Only the marks of a passing
 * schema matter, because a schema whose sibling fails fails anyway. That's
 * only true without plugins or annotations, so it's for the fast mode only.
 *
 * @type Optimization
 */
export default {
  optimize(kernel, { fast }) {
    /** @type Map<Handle, CompiledSchema> */
    const replaced = new Map();
    if (!fast) {
      return replaced;
    }

    const analyses = {
      properties: new Analysis(kernel.schemas, "properties"),
      items: new Analysis(kernel.schemas, "items")
    };

    // Only the schemas that read marks can have a selector to replace
    for (const handle of kernel.reads.evaluated) {
      const schema = kernel.schemas[handle];
      if (typeof schema === "boolean" || !schema.keywords.some(({ expression }) => readerKind(expression) !== undefined)) {
        continue;
      }

      /** @type KeywordGroup[] */
      const keywords = [];
      for (const group of schema.keywords) {
        const kind = readerKind(group.expression);
        const marks = kind && analyses[kind].siblingMarks(schema, group);
        const expression = marks && replacement(/** @type Reader */ (group.expression), marks);
        keywords.push(expression ? { ...group, expression } : group);
      }

      replaced.set(handle, { ...schema, keywords });
    }

    return replaced;
  }
};

/**
 * @typedef {Extract<Expression, { op: "eachProperty" | "eachItem" }>} Reader
 */

/** @type (expression: Expression) => "properties" | "items" | undefined */
const readerKind = (expression) => {
  if (expression.op === "eachProperty" && "unevaluated" in expression.select) {
    return "properties";
  } else if (expression.op === "eachItem" && "unevaluated" in expression) {
    return "items";
  }
};

/**
 * What a reader is without reading marks, if it can be said
 *
 * @type (reader: Reader, marks: Marks) => Expression | undefined
 */
const replacement = (reader, marks) => {
  if (isAll(marks)) {
    return { op: "pass" };
  } else if (reader.op === "eachProperty") {
    if (marks.excepts.length > 0) {
      return;
    }

    return { op: "eachProperty", select: { except: { names: [...marks.names], patterns: [...marks.patterns] } }, of: reader.of };
  } else {
    const prefix = prefixOf(marks.items);
    if (prefix === undefined || marks.from !== Infinity) {
      return;
    }

    return { op: "eachItem", from: prefix, of: reader.of };
  }
};

/**
 * The number of items marked from the first one on, if those are the only
 * ones marked
 *
 * @type (items: Set<number>) => number | undefined
 */
const prefixOf = (items) => {
  for (let index = 0; index < items.size; index++) {
    if (!items.has(index)) {
      return;
    }
  }

  return items.size;
};

/** @type () => Marks */
const nothing = () => ({ all: false, names: new Set(), patterns: new Set(), excepts: [], items: new Set(), from: Infinity });

/** @type () => Marks */
const everything = () => ({ ...nothing(), all: true });

/**
 * Every name an `except` doesn't select is marked by something else, or
 * every item before `from` is marked
 *
 * @type (marks: Marks) => boolean
 */
const isAll = (marks) => {
  if (marks.all) {
    return true;
  } else if (marks.excepts.length > 0) {
    return marks.excepts.some((except) => except.names.every((name) => marks.names.has(name))
      && except.patterns.every((pattern) => marks.patterns.has(pattern)));
  }

  const prefix = prefixOf(new Set([...marks.items].filter((index) => index < marks.from)));
  return prefix !== undefined && prefix >= marks.from;
};

/** @type (marks: Marks) => boolean */
const isNothing = (marks) => !isAll(marks) && marks.names.size === 0 && marks.patterns.size === 0
  && marks.excepts.length === 0 && marks.items.size === 0 && marks.from === Infinity;

/** @type (marks: Marks, more: Marks) => void */
const addMarks = (marks, more) => {
  marks.all ||= more.all;
  for (const name of more.names) {
    marks.names.add(name);
  }
  for (const pattern of more.patterns) {
    marks.patterns.add(pattern);
  }
  marks.excepts.push(...more.excepts);
  for (const index of more.items) {
    marks.items.add(index);
  }
  marks.from = Math.min(marks.from, more.from);
};

/**
 * Finds the marks schemas make, of one kind. Marks are kept in one set for
 * properties and items, because an instance can't be both, so the
 * operations on items don't mark properties, and the other way around.
 */
class Analysis {
  /** @type Record<Handle, CompiledSchema> */
  #schemas;

  /** @type {"properties" | "items"} */
  #kind;

  /** @type Map<Handle, Marks | undefined> */
  #marks;

  /** @type Set<Handle> */
  #inProgress;

  /**
   * @param {Record<Handle, CompiledSchema>} schemas
   * @param {"properties" | "items"} kind
   */
  constructor(schemas, kind) {
    this.#schemas = schemas;
    this.#kind = kind;
    this.#marks = new Map();
    this.#inProgress = new Set();
  }

  /**
   * The marks every group in a schema but one makes
   *
   * @type (schema: Exclude<CompiledSchema, boolean>, except?: KeywordGroup) => Marks | undefined
   */
  siblingMarks(schema, except) {
    const marks = nothing();
    for (const group of schema.keywords) {
      if (group === except) {
        continue;
      }

      const groupMarks = this.#expressionMarks(group.expression);
      if (groupMarks === undefined) {
        return;
      }
      addMarks(marks, groupMarks);
    }

    return marks;
  }

  /**
   * The marks an expression makes on the instance it's evaluated on, or
   * undefined if they depend on the instance
   *
   * @type (expression: Expression) => Marks | undefined
   */
  #expressionMarks(expression) {
    const isProperties = this.#kind === "properties";
    switch (expression.op) {
      case "all": {
        const marks = nothing();
        for (const subexpression of expression.of) {
          const subexpressionMarks = this.#expressionMarks(subexpression);
          if (subexpressionMarks === undefined) {
            return;
          }
          addMarks(marks, subexpressionMarks);
        }
        return marks;
      }
      case "any":
      case "one":
        return this.#conditionalMarks(expression.of);
      case "cases":
        return this.#conditionalMarks([
          ...expression.cases.flatMap(([condition, then]) => then === null ? [condition] : [condition, then]),
          ...expression.otherwise === null ? [] : [expression.otherwise]
        ]);
      case "typeSwitch":
      case "propertySwitch":
        return this.#conditionalMarks(subexpressions(expression));
      case "apply":
        return this.#schemaMarks(expression.schema);
      case "dynamicApply":
      case "opaque":
        return;

      case "property":
        return isProperties ? { ...nothing(), names: new Set([expression.name]) } : nothing();
      case "eachProperty":
        if (!isProperties) {
          return nothing();
        } else if ("pattern" in expression.select) {
          return { ...nothing(), patterns: new Set([expression.select.pattern]) };
        } else if ("except" in expression.select) {
          return { ...nothing(), excepts: [expression.select.except] };
        }
        return everything();

      case "item":
        return isProperties ? nothing() : { ...nothing(), items: new Set([expression.index]) };
      case "eachItem":
        if (isProperties) {
          return nothing();
        }
        return "unevaluated" in expression ? everything() : { ...nothing(), from: expression.from };
      case "contains":
        return isProperties ? nothing() : undefined;
      case "itemSequence":
        return isProperties ? nothing() : everything();

      // `not` only passes if what it applies fails, so its marks aren't
      // kept. Nothing else marks the instance it's evaluated on.
      default:
        return nothing();
    }
  }

  /**
   * Whether what an operation applies passes depends on the instance, so
   * its marks are only known if nothing it applies marks anything
   *
   * @type (expressions: Expression[]) => Marks | undefined
   */
  #conditionalMarks(expressions) {
    for (const expression of expressions) {
      const marks = this.#expressionMarks(expression);
      if (marks === undefined || !isNothing(marks)) {
        return;
      }
    }

    return nothing();
  }

  /** @type (handle: Handle) => Marks | undefined */
  #schemaMarks(handle) {
    if (this.#marks.has(handle)) {
      return this.#marks.get(handle);
    }

    const schema = this.#schemas[handle];
    if (typeof schema === "boolean") {
      return nothing();
    }

    // A schema that applies itself to the same instance never finishes
    // evaluating, so it isn't worth knowing
    if (this.#inProgress.has(handle)) {
      return;
    }

    this.#inProgress.add(handle);
    const marks = this.siblingMarks(schema);
    this.#inProgress.delete(handle);

    this.#marks.set(handle, marks);
    return marks;
  }
}
