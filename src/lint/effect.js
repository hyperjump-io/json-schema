import { subexpressions } from "../kernel/kernel.js";
import { appliedSchemas } from "./applied.js";

/**
 * @import { Expression, Op } from "../kernel/kernel.d.ts"
 * @import { JsonSchemaDocumentNode, JsonSchemaKeywordNode, JsonSchemaNode } from "../schema/schema-ast.d.ts"
 * @import { JsonSchemaSession } from "../session.d.ts"
 * @import { LoweredKeyword } from "./lower.d.ts"
 */

/**
 * What a keyword group does, besides passing:
 *
 * - `none`: nothing. It always passes, and doesn't annotate or mark.
 * - `marks`: it always passes and doesn't annotate, but marks particular
 *   properties or items, which only an `unevaluated*` can see.
 * - `marksAll`: like `marks`, but it marks every property or item that
 *   others don't (`additionalProperties: true`, `items: {}`).
 * - `some`: anything else, or it isn't known.
 *
 * @typedef {"none" | "marks" | "marksAll" | "some"} Effect
 */

/** Operations that can fail, but never annotate or mark */
const assertions = new Set(/** @type Op[] */ ([
  "pass", "fail", "typeIs", "equals", "oneOfValues", "range", "multipleOf", "stringLength", "matches", "itemCount",
  "uniqueItems", "propertyCount", "hasProperty", "propertyEquals", "predicate"
]));

/** @type Effect[] */
const order = ["none", "marks", "marksAll", "some"];

/**
 * What a keyword's group does, following the schemas it applies, so a
 * schema with no effect is the same as `true`. A reference is followed with
 * `findSchema`, into another document too, and one that can't be followed
 * has `some`. What a schema applied to a property or an item marks is about
 * that property or item, so it's `some` there. With `handle`, it's what a
 * schema the keyword applies (`apply`) does, like `then`'s for `if`.
 *
 * @type (session: JsonSchemaSession, tree: JsonSchemaDocumentNode, keyword: LoweredKeyword, handle?: string) => Promise<Effect>
 */
export const effectOf = async (session, tree, keyword, handle) => {
  const { keywordsOf, find, appliedBy } = await appliedSchemas(session, tree);

  /** @type Set<JsonSchemaNode> */
  const following = new Set();

  /** @type (node: JsonSchemaNode | undefined) => Promise<Effect> */
  const ofSchema = async (node) => {
    if (node === undefined) {
      return "some";
    } else if (node.type === "reference") {
      return ofSchema(await find(node.href));
    } else if (node.jsonType === "boolean") {
      return node.value ? "none" : "some";
    }

    const keywords = keywordsOf(node);
    if (keywords === undefined || following.has(node)) {
      return "some";
    }

    following.add(node);
    /** @type Effect[] */
    const effects = [];
    for (const keyword of keywords) {
      effects.push(await ofKeyword(keyword));
    }
    following.delete(node);
    return combine(effects);
  };

  /** @type (keyword: LoweredKeyword) => Promise<Effect> */
  const ofKeyword = async (keyword) => {
    const applied = appliedBy(keyword);

    /** @type (handle: string) => Promise<Effect> */
    const ofApplied = async (handle) => ofSchema(await applied(handle));

    /** @type (expression: Expression) => Promise<Effect> */
    const ofChild = async (expression) => await ofExpression(expression) === "none" ? "none" : "some";

    /**
     * Whether a condition never annotates or marks, whether it passes or
     * not
     *
     * @type (expression: Expression) => Promise<boolean>
     */
    const isPure = async (expression) => {
      switch (expression.op) {
        case "all":
        case "any":
        case "one":
          return everyAsync(expression.of, isPure);
        case "not":
          return isPure(expression.of);
        case "cases":
          return await everyAsync(expression.cases, async ([condition, then]) => await isPure(condition) && (then === null || await isPure(then)))
            && (expression.otherwise === null || await isPure(expression.otherwise));
        case "typeSwitch":
        case "propertySwitch":
        case "keySwitch":
          return everyAsync(subexpressions(expression), isPure);
        case "apply":
          return await ofApplied(expression.schema) === "none";
        default:
          return assertions.has(expression.op);
      }
    };

    /** @type (expression: Expression) => Promise<boolean> */
    const isNone = async (expression) => await ofExpression(expression) === "none";

    /** @type (expression: Expression) => Promise<Effect> */
    const ofExpression = async (expression) => {
      switch (expression.op) {
        case "pass":
          return "none";
        case "all": {
          /** @type Effect[] */
          const effects = [];
          for (const of of expression.of) {
            effects.push(await ofExpression(of));
          }
          return combine(effects);
        }
        case "any":
          return await everyAsync(expression.of, isNone) ? "none" : "some";
        case "one":
          return expression.of.length === 1 && await isNone(expression.of[0]) ? "none" : "some";
        case "cases": {
          const branches = [...expression.cases.map(([, then]) => then), expression.otherwise];
          const conditionsArePure = await everyAsync(expression.cases, ([condition]) => isPure(condition));
          return conditionsArePure && await everyAsync(branches, async (branch) => branch === null || await isNone(branch)) ? "none" : "some";
        }
        // The branch for the instance applies, without a condition
        case "typeSwitch":
        case "propertySwitch":
        case "keySwitch":
          return await everyAsync(subexpressions(expression), isNone) ? "none" : "some";
        case "apply": {
          // What a schema applied in place marks everywhere is still only
          // some of what this keyword's schema marks
          const effect = await ofApplied(expression.schema);
          return effect === "marksAll" ? "marks" : effect;
        }
        case "property":
        case "item":
          return await ofChild(expression.of) === "none" ? "marks" : "some";
        case "eachProperty":
          return await ofChild(expression.of) === "none" ? ("pattern" in expression.select ? "marks" : "marksAll") : "some";
        case "eachItem":
          return await ofChild(expression.of) === "none" ? "marksAll" : "some";
        case "contains":
          return expression.min === 0 && expression.max === null && await ofChild(expression.of) === "none" ? "marks" : "some";
        case "eachPropertyName":
          return ofChild(expression.of);
        default:
          return "some";
      }
    };

    return ofExpression(keyword.group.expression);
  };

  return handle === undefined ? ofKeyword(keyword) : ofSchema(await appliedBy(keyword)(handle));
};

/**
 * Whether a keyword that reads this one as a sibling lowers differently
 * without it, so it has an effect there
 *
 * @type (keywords: LoweredKeyword[], keywordNode: JsonSchemaKeywordNode) => boolean
 */
export const affectsAReader = (keywords, keywordNode) => keywords
  .some(({ sourceNodes, sourcesWithoutEffect }) => sourceNodes.includes(keywordNode) && !sourcesWithoutEffect.includes(keywordNode));

/** @type (effects: Effect[]) => Effect */
const combine = (effects) => effects.reduce((a, b) => order.indexOf(a) > order.indexOf(b) ? a : b, /** @type Effect */ ("none"));

/**
 * @template T
 * @param {T[]} items
 * @param {(item: T) => Promise<boolean>} predicate
 * @returns {Promise<boolean>}
 */
const everyAsync = async (items, predicate) => {
  for (const item of items) {
    if (!await predicate(item)) {
      return false;
    }
  }
  return true;
};
