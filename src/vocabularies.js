/**
 * @import { JsonErrorNode, JsonNode } from "@hyperjump/browser/json"
 */

/**
 * Get the `$vocabulary` of a meta-schema as a map of vocabulary URIs to
 * whether they're required. Entries that aren't booleans are ignored. It's
 * undefined if there's no `$vocabulary` object.
 *
 * @type (node: JsonNode<{ type: string }, JsonErrorNode, unknown> | JsonErrorNode) => Record<string, boolean> | undefined
 */
export const vocabulariesOf = (node) => {
  if (!("jsonType" in node) || node.jsonType !== "object") {
    return;
  }

  const property = node.children.find((property) => property.children[0].value === "$vocabulary");
  const vocabularyNode = property?.children[1];
  if (!vocabularyNode || !("jsonType" in vocabularyNode) || vocabularyNode.jsonType !== "object") {
    return;
  }

  /** @type Record<string, boolean> */
  const vocabularies = {};
  for (const vocabularyProperty of vocabularyNode.children) {
    const [nameNode, valueNode] = vocabularyProperty.children;
    if ("jsonType" in valueNode && valueNode.jsonType === "boolean") {
      vocabularies[nameNode.value] = valueNode.value;
    }
  }

  return vocabularies;
};
