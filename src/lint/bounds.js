import { operationsOf } from "./analysis.js";

/**
 * @import { Expression } from "../kernel/kernel.d.ts"
 * @import { JsonSchemaKeywordNode } from "../schema/schema-ast.d.ts"
 * @import { LoweredKeyword } from "./lower.d.ts"
 * @import { MustPass } from "./in-place.js"
 */

/**
 * A limit, and where it's from. `label` is the keywords it came from, with
 * the ones that made it exclusive when they're others (draft-04's
 * `exclusiveMinimum`). `limitNodes` are the keywords its value came from,
 * and `keywordNode` is the last of them. `alone` is whether it's all its
 * keyword lowers to, so the keyword has no effect if the limit doesn't.
 * `via` is the applied schema it's from, for a limit from
 * {@link boundsInPlace} that isn't the schema's own.
 *
 * @typedef {{
 *   value: number;
 *   exclusive: boolean;
 *   label: string;
 *   keywordNode: JsonSchemaKeywordNode;
 *   limitNodes: JsonSchemaKeywordNode[];
 *   alone: boolean;
 *   via?: string;
 * }} Bound
 */

/**
 * @typedef {{ min: Bound[]; max: Bound[] }} Bounds
 */

/** The operations that limit a count, and what they count */
const counts = /** @type const */ ({ stringLength: "string", itemCount: "array", propertyCount: "object" });

/**
 * The limits a schema's keywords put on numbers (`range`) and on the
 * lengths of strings, arrays, and objects (`stringLength`, `itemCount`,
 * `propertyCount`), from whichever keywords lowered to them
 *
 * @type (keywords: LoweredKeyword[]) => Record<"number" | "string" | "array" | "object", Bounds>
 */
export const boundsOf = (keywords) => {
  const result = {
    number: bounds(),
    string: bounds(),
    array: bounds(),
    object: bounds()
  };

  for (const { group, cameFrom } of keywords) {
    const operations = operationsOf(group.expression);

    /** @type (operation: Expression, field: "min" | "max", value: number, exclusiveField?: string) => Bound */
    const bound = (operation, field, value, exclusiveField) => {
      const limitNodes = cameFrom(operation, field);
      const exclusiveNodes = (exclusiveField === undefined ? [] : cameFrom(operation, exclusiveField))
        .filter((exclusiveNode) => !limitNodes.includes(exclusiveNode));
      const other = field === "min" ? "max" : "min";
      return {
        value,
        exclusive: exclusiveField !== undefined,
        label: exclusiveNodes.length > 0 ? `${namesOf(limitNodes)} with ${namesOf(exclusiveNodes)}` : namesOf(limitNodes),
        keywordNode: /** @type JsonSchemaKeywordNode */ (limitNodes.at(-1)),
        limitNodes,
        alone: operations.length === 1 && /** @type Record<string, unknown> */ (operation)[other] === undefined
      };
    };

    for (const operation of operations) {
      if (operation.op === "range") {
        if (operation.min !== undefined) {
          result.number.min.push(bound(operation, "min", operation.min, operation.exclusiveMin ? "exclusiveMin" : undefined));
        }
        if (operation.max !== undefined) {
          result.number.max.push(bound(operation, "max", operation.max, operation.exclusiveMax ? "exclusiveMax" : undefined));
        }
      } else if (operation.op === "stringLength" || operation.op === "itemCount" || operation.op === "propertyCount") {
        const type = counts[operation.op];
        if (operation.min !== undefined) {
          result[type].min.push(bound(operation, "min", operation.min));
        }
        if (operation.max !== undefined) {
          result[type].max.push(bound(operation, "max", operation.max));
        }
      }
    }
  }

  return result;
};

/**
 * The limits of a schema's keywords and of what it applies that has to
 * pass (`keywordsThatMustPass`), so a limit in `allOf` or behind `$ref`
 * counts. A limit from an applied schema is said and placed as the keyword
 * in the schema that applied it, like "'maximum' in 'allOf'", because the
 * schema it's in can be anywhere in the document.
 *
 * @type (mustPass: MustPass[]) => Record<"number" | "string" | "array" | "object", Bounds>
 */
export const boundsInPlace = (mustPass) => {
  const result = {
    number: bounds(),
    string: bounds(),
    array: bounds(),
    object: bounds()
  };

  for (const { keyword, applying, via } of mustPass) {
    const keywordBounds = boundsOf([keyword]);
    for (const type of /** @type const */ (["number", "string", "array", "object"])) {
      for (const field of /** @type const */ (["min", "max"])) {
        for (const bound of keywordBounds[type][field]) {
          result[type][field].push(applying === undefined
            ? bound
            : { ...bound, label: `${bound.label} in ${namesOf([applying])}`, keywordNode: applying, via });
        }
      }
    }
  }

  return result;
};

/**
 * Whether two limits are from the same applied schema, whose own group has
 * them both, so it's where something about them is reported
 *
 * @type (a: Bound, b: Bound) => boolean
 */
export const fromSameApplied = (a, b) => a.via !== undefined && a.via === b.via;

/**
 * The lower limit that allows the least
 *
 * @type (bounds: Bound[]) => Bound | undefined
 */
export const tightestMin = (bounds) => tightest(bounds, (a, b) => a > b);

/**
 * The upper limit that allows the least
 *
 * @type (bounds: Bound[]) => Bound | undefined
 */
export const tightestMax = (bounds) => tightest(bounds, (a, b) => a < b);

/**
 * Keywords' names, like "'minimum' and 'exclusiveMinimum'"
 *
 * @type (keywordNodes: JsonSchemaKeywordNode[]) => string
 */
export const namesOf = (keywordNodes) => keywordNodes.map((keywordNode) => `'${keywordNode.children[0].value}'`).join(" and ");

/**
 * The second of two keywords in the document. A message about both goes on
 * it, because it's the one that contradicts the other.
 *
 * @type (a: JsonSchemaKeywordNode, b: JsonSchemaKeywordNode) => JsonSchemaKeywordNode
 */
export const second = (a, b) => {
  return /** @type number */ (a.position?.start.offset) < /** @type number */ (b.position?.start.offset) ? b : a;
};

/** @type () => Bounds */
const bounds = () => ({ min: [], max: [] });

/**
 * The bound that allows the least. On a tie, an exclusive bound allows less.
 *
 * @type (bounds: Bound[], isTighter: (a: number, b: number) => boolean) => Bound | undefined
 */
const tightest = (bounds, isTighter) => {
  let result;
  for (const candidate of bounds) {
    if (result === undefined || isTighter(candidate.value, result.value) || (candidate.value === result.value && candidate.exclusive)) {
      result = candidate;
    }
  }

  return result;
};
