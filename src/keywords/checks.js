import { isRegex } from "@hyperjump/json-schema-formats";
import { isPattern } from "./utilities.js";

/**
 * @import { JsonErrorNode } from "@hyperjump/browser"
 * @import { CheckContext } from "../keyword.d.ts"
 * @import { JsonSchemaTolerantNode } from "../schema/schema-ast.d.ts"
 */

/**
 * Checks for keyword values. Each one is a keyword's `check`, or part of one.
 * A value inside the keyword's value can be a node that couldn't be parsed.
 * It already has a syntax error, so checks skip it.
 *
 * @typedef {(node: JsonSchemaTolerantNode | JsonErrorNode, context: CheckContext) => void} Check
 */

/** @type (node: JsonSchemaTolerantNode | JsonErrorNode) => node is JsonErrorNode */
export const isErrorNode = (node) => node.type === "json-invalid" || node.type === "json-missing";

/** @type (description: string, test: (node: JsonSchemaTolerantNode) => boolean) => Check */
export const expected = (description, test) => (node, context) => {
  if (!isErrorNode(node) && !test(node)) {
    context.message(`Expected ${description}`, node);
  }
};

export const string = expected("a string", (node) => node.jsonType === "string");
export const boolean = expected("a boolean", (node) => node.jsonType === "boolean");
export const number = expected("a number", (node) => node.jsonType === "number");
export const array = expected("an array", (node) => node.jsonType === "array");

export const nonNegativeInteger = expected("a non-negative integer", (node) => {
  return node.jsonType === "number" && Number.isInteger(node.value) && node.value >= 0;
});

export const positiveNumber = expected("a number greater than 0", (node) => {
  return node.jsonType === "number" && node.value > 0;
});

/** An ECMA-262 regular expression with the `u` flag */
export const regex = expected("a regular expression", (node) => {
  return node.jsonType === "string" && isRegex(node.value);
});

/**
 * An ECMA-262 regular expression, with the `u` flag or, if it's only valid
 * without it, without it (`isPattern`), for the drafts before v1
 */
export const pattern = expected("a regular expression", (node) => {
  return node.jsonType === "string" && isPattern(node.value);
});

/** A name for `$anchor`, `$dynamicAnchor`, and v1's `$dynamicRef` */
export const anchorName = expected("an anchor name: a letter or '_' followed by letters, digits, '-', '.', or '_'", (node) => {
  return node.jsonType === "string" && /^[A-Za-z_][-A-Za-z0-9._]*$/.test(node.value);
});

/**
 * An array of strings. The specs say some must be unique, but a duplicate
 * changes nothing, so `duplicate-array-items` reports it (see
 * `lint/validity.md`).
 *
 * @type Check
 */
export const strings = (node, context) => {
  if (isErrorNode(node)) {
    return;
  } else if (node.jsonType !== "array") {
    context.message("Expected an array of strings", node);
    return;
  }

  for (const itemNode of node.children) {
    if (!isErrorNode(itemNode) && itemNode.jsonType !== "string") {
      context.message("Expected a string", itemNode);
    }
  }
};

/** @type (check: Check) => Check */
export const mapOf = (check) => (node, context) => {
  if (isErrorNode(node)) {
    return;
  } else if (node.jsonType !== "object") {
    context.message("Expected an object", node);
    return;
  }

  for (const property of node.children) {
    check(property.children[1], context);
  }
};
