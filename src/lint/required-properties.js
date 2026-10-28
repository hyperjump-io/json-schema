/**
 * @import { Expression } from "../kernel/kernel.d.ts"
 * @import { JsonSchemaKeywordNode, JsonSchemaNode } from "../schema/schema-ast.d.ts"
 * @import { LoweredKeyword } from "./lower.d.ts"
 */

/**
 * A way for an object to pass a schema, as far as properties go: the
 * properties it has to have, the ones it can't have, and the keywords in the
 * schema that require any of them
 *
 * @typedef {{ names: Set<string>; absent: Set<string>; keywordNodes: Set<JsonSchemaKeywordNode> }} Alternative
 */

/**
 * The keyword in the schema that what's required counts as, given the
 * schema it's from, if it's from an applied schema
 *
 * @typedef {(schema?: string) => JsonSchemaKeywordNode} Credit
 */

/**
 * More alternatives than this are combined into one, which only has what
 * they all have in common, so the number doesn't grow with every `anyOf`
 */
const limit = 64;

/**
 * The ways for an object to pass a schema, given its keywords, from what they
 * lower to. `hasProperty` requires a property. Schemas that are applied
 * (`apply`) are followed, if they're in `schemas`, by location. `any` and
 * `one` can pass any way one of theirs can. In `cases`, each case can pass
 * with its condition and its branch, after the conditions before it failed.
 * A condition that fails says the property isn't there if it's
 * `hasProperty`, which is how a dependency (`dependentRequired`) only
 * requires something of an object with the property it depends on. Nothing
 * else is known about a failed condition. In the switches, each branch can
 * pass with what the object has to be for it: with the property or without
 * it (`propertySwitch`), or with the case's property and none of the ones
 * before (`keySwitch`). Everything else allows any properties.
 *
 * Only alternatives that are possible are included, so if there are none,
 * no object passes. `present` are properties the object is known to have.
 *
 * @type (schemaNode: JsonSchemaNode, keywords: LoweredKeyword[], schemas: Map<string, LoweredKeyword[]>, present?: string[]) => Alternative[]
 */
export const propertyAlternatives = (schemaNode, keywords, schemas, present = []) => {
  // The schemas being followed, so a schema that applies itself stops
  const following = new Set([schemaNode.location]);

  /**
   * What a keyword in the schema requires counts as that keyword's, and what
   * a schema it applies requires counts as the keyword whose value the
   * schema is in, which can be a sibling it reads (`then` for `if`). A
   * followed schema's keywords count as the keyword that applied it.
   *
   * @type (keywords: LoweredKeyword[], applying?: JsonSchemaKeywordNode) => Alternative[]
   */
  const ofKeywords = (keywords, applying) => {
    let alternatives = [empty()];
    for (const { group, keywordNode, sourceNodes } of keywords) {
      /** @type Credit */
      const credit = applying === undefined
        ? (schema) => {
            const index = schema === undefined ? -1 : group.sources.findIndex((source) => isIn(schema, source));
            return index === -1 ? keywordNode : sourceNodes[index];
          }
        : () => applying;
      alternatives = both(alternatives, ofExpression(group.expression, credit));
    }
    return alternatives;
  };

  /** @type (expression: Expression, credit: Credit) => Alternative[] */
  const ofExpression = (expression, credit) => {
    switch (expression.op) {
      case "hasProperty":
        return [{ names: new Set([expression.name]), absent: new Set(), keywordNodes: new Set([credit()]) }];
      case "fail":
        return [];
      case "all":
        return expression.of.reduce((alternatives, of) => both(alternatives, ofExpression(of, credit)), [empty()]);
      case "any":
      case "one":
        return bounded(expression.of.flatMap((of) => ofExpression(of, credit)));
      case "apply": {
        const keywords = schemas.get(expression.schema);
        if (keywords === undefined || following.has(expression.schema)) {
          return [empty()];
        }

        following.add(expression.schema);
        const alternatives = ofKeywords(keywords, credit(expression.schema));
        following.delete(expression.schema);
        return alternatives;
      }
      case "cases": {
        /** @type Alternative[] */
        const alternatives = [];
        let earlierFailed = [empty()];
        for (const [condition, then] of expression.cases) {
          const passes = both(earlierFailed, ofExpression(condition, credit));
          alternatives.push(...then === null ? passes : both(passes, ofExpression(then, credit)));

          const [operation, ...rest] = unguarded(condition);
          const fails = operation?.op === "hasProperty" && rest.length === 0
            ? { names: new Set(), absent: new Set([operation.name]), keywordNodes: new Set() }
            : empty();
          earlierFailed = both(earlierFailed, [fails]);
        }
        alternatives.push(...expression.otherwise === null ? earlierFailed : both(earlierFailed, ofExpression(expression.otherwise, credit)));
        return bounded(alternatives);
      }
      case "typeSwitch":
        return ofExpression(expression.cases.object ?? expression.otherwise, credit);
      case "propertySwitch": {
        // Every branch but `absent` is for an object that has the property
        const has = [{ names: new Set([expression.name]), absent: new Set(), keywordNodes: new Set([credit()]) }];
        const hasNot = [{ names: new Set(), absent: new Set([expression.name]), keywordNodes: new Set() }];
        return bounded([
          ...[...expression.cases.map(([, then]) => then), expression.other, expression.unparsed].flatMap((branch) => both(has, ofExpression(branch, credit))),
          ...both(hasNot, ofExpression(expression.absent, credit))
        ]);
      }
      case "keySwitch": {
        // A case is for an object that has its property and none of the ones
        // before it, as far as properties that were parsed go
        /** @type Alternative[] */
        const alternatives = [];
        /** @type Set<string> */
        const before = new Set();
        for (const [name, then] of expression.cases) {
          alternatives.push(...both([{ names: new Set([name]), absent: new Set(before), keywordNodes: new Set([credit()]) }], ofExpression(then, credit)));
          before.add(name);
        }
        alternatives.push(...both([{ names: new Set(), absent: before, keywordNodes: new Set() }], ofExpression(expression.none, credit)));
        alternatives.push(...ofExpression(expression.unparsed, credit));
        return bounded(alternatives);
      }
      default:
        return [empty()];
    }
  };

  const known = { names: new Set(present), absent: new Set(), keywordNodes: new Set() };
  return both([known], ofKeywords(keywords));
};

/**
 * The fewest properties an object can have and pass, and whether every way
 * to pass with that few has the same ones
 *
 * @type (alternatives: Alternative[]) => { count: number; exact: boolean }
 */
export const fewestProperties = (alternatives) => {
  const count = Math.min(...alternatives.map(({ names }) => names.size));
  const fewest = alternatives.filter(({ names }) => names.size === count).map(({ names }) => [...names].sort().join("\0"));
  return { count, exact: new Set(fewest).size === 1 };
};

/**
 * The properties every object that passes a schema's other keywords than
 * one has (see {@link propertyAlternatives}). It's undefined if no object
 * passes them, which `contradictory-limits` reports.
 *
 * @type (schemaNode: JsonSchemaNode, keywords: LoweredKeyword[], schemas: Map<string, LoweredKeyword[]>, keyword: LoweredKeyword) => Set<string> | undefined
 */
export const requiredByOthers = (schemaNode, keywords, schemas, keyword) => {
  const alternatives = propertyAlternatives(schemaNode, keywords.filter((other) => other !== keyword), schemas);
  return alternatives.length === 0 ? undefined : intersection(alternatives.map(({ names }) => names));
};

/**
 * Whether a location is at or under another
 *
 * @type (location: string, parent: string) => boolean
 */
const isIn = (location, parent) => location === parent || location.startsWith(`${parent}/`);

/** @type () => Alternative */
const empty = () => ({ names: new Set(), absent: new Set(), keywordNodes: new Set() });

/** @type (alternative: Alternative) => boolean */
const isPossible = ({ names, absent }) => [...names].every((name) => !absent.has(name));

/** @type <T>(sets: Set<T>[]) => Set<T> */
const intersection = (sets) => sets.reduce((result, set) => new Set([...result].filter((item) => set.has(item))));

/** @type (alternatives: Alternative[]) => Alternative[] */
const bounded = (alternatives) => {
  if (alternatives.length <= limit) {
    return alternatives;
  }

  return [{
    names: intersection(alternatives.map(({ names }) => names)),
    absent: intersection(alternatives.map(({ absent }) => absent)),
    keywordNodes: new Set(alternatives.flatMap(({ keywordNodes }) => [...keywordNodes]))
  }];
};

/**
 * The ways to pass both of two expressions
 *
 * @type (a: Alternative[], b: Alternative[]) => Alternative[]
 */
const both = (a, b) => {
  /** @type Alternative[] */
  const alternatives = [];
  for (const x of a) {
    for (const y of b) {
      const alternative = {
        names: new Set([...x.names, ...y.names]),
        absent: new Set([...x.absent, ...y.absent]),
        keywordNodes: new Set([...x.keywordNodes, ...y.keywordNodes])
      };
      if (isPossible(alternative)) {
        alternatives.push(alternative);
      }
    }
  }
  return bounded(alternatives);
};

/**
 * A condition's operations, without the type guard conditions about
 * properties have
 *
 * @type (condition: Expression) => Expression[]
 */
const unguarded = (condition) => (condition.op === "all" ? condition.of : [condition])
  .filter((operation) => operation.op !== "typeIs" || !operation.types.includes("object"));
