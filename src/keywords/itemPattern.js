import { isErrorNode } from "./checks.js";

/**
 * @import { Keyword } from "../keyword.d.ts"
 * @import { Expression, ItemPattern } from "../kernel/kernel.d.ts"
 */

/**
 * @typedef {{ array: ("schema" | "data" | ItemPatternShape)[] }} ItemPatternShape
 * @typedef {Expression | "*" | "+" | "?" | "|" | any[]} Rule
 */

// Groups are arrays, and they can be nested. Operators are strings, which a
// shape can't describe, so the shape leaves everything that isn't a schema or
// a group to the check.
/** @type ItemPatternShape["array"] */
const ruleShapes = ["schema"];
/** @type ItemPatternShape */
const shape = { array: ruleShapes };
ruleShapes.push(shape, "data");

const operators = ["*", "+", "?", "|"];

/**
 * Everything in a pattern that isn't a schema or a group has to be an
 * operator. The resolver already checked the schemas.
 *
 * @type NonNullable<Keyword["check"]>
 */
const checkPattern = (node, context) => {
  if (node.jsonType !== "array") {
    return;
  }

  for (const itemNode of node.children) {
    if (isErrorNode(itemNode) || itemNode.type === "json-schema") {
      continue;
    } else if (itemNode.jsonType === "array") {
      checkPattern(itemNode, context);
    } else if (itemNode.jsonType !== "string" || !operators.includes(itemNode.value)) {
      context.message("Expected a schema, an array, or one of '*', '+', '?', '|'", itemNode);
    }
  }
};

/**
 * A pattern's rules as the kernel's tree: schemas in sequence, groups, and
 * operators. An operator applies to what's before it, and `|` separates
 * alternatives.
 *
 * @type (rules: Rule[]) => ItemPattern
 */
const itemPattern = (rules) => {
  /** @type ItemPattern[][] */
  const alternatives = [[]];
  for (const rule of rules) {
    const sequence = /** @type ItemPattern[] */ (alternatives.at(-1));
    if (rule === "|") {
      alternatives.push([]);
    } else if (typeof rule === "string") {
      const repeated = /** @type ItemPattern */ (sequence.pop());
      sequence.push({ repeat: repeated, min: rule === "+" ? 1 : 0, max: rule === "?" ? 1 : null });
    } else if (Array.isArray(rule)) {
      sequence.push(itemPattern(rule));
    } else {
      sequence.push({ item: rule });
    }
  }

  /** @type ItemPattern[] */
  const sequences = alternatives.map((sequence) => sequence.length === 1 ? sequence[0] : { sequence });
  return sequences.length === 1 ? sequences[0] : { either: sequences };
};

/**
 * `itemPattern`. The items have to match a pattern like a regular
 * expression, where each item is matched by a schema. Schemas match in
 * sequence. Arrays group. `"*"`, `"+"`, and `"?"` repeat what's before them,
 * and `"|"` separates alternatives.
 *
 * @type Keyword<Rule[], ItemPatternShape>
 */
export default {
  uri: "https://json-schema.org/keyword/itemPattern",
  shape: shape,
  check: checkPattern,
  lower: (rules) => ({ op: "itemSequence", pattern: itemPattern(rules) })
};
