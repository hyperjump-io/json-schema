/**
 * @import { JsonSchemaKeywordNode, JsonSchemaNode } from "../schema/schema-ast.d.ts"
 */

/**
 * Keywords whose value is an array the specs say can't be empty. Each is
 * found by its URI, so the drafts that allow an empty array, like `type`
 * before v1, aren't in it.
 */
const arrays = new Set([
  "https://json-schema.org/keyword/allOf",
  "https://json-schema.org/keyword/anyOf",
  "https://json-schema.org/keyword/oneOf",
  "https://json-schema.org/keyword/prefixItems",
  "https://json-schema.org/keyword/conditional",
  "https://json-schema.org/keyword/type",
  "https://json-schema.org/keyword/draft-04/required",
  "https://json-schema.org/keyword/draft-04/enum"
]);

/** Keywords whose value is an object of arrays that can't be empty */
const mapsOfArrays = new Set([
  "https://json-schema.org/keyword/draft-04/dependencies"
]);

/**
 * The empty arrays in a keyword's value that the specs say can't be empty,
 * each with the property it's for in an object of arrays. `empty-array`
 * reports them, so the rules that would also report what they do, like
 * `keyword-allows-nothing`, leave them out.
 *
 * @type (keywordNode: JsonSchemaKeywordNode) => [JsonSchemaNode, string | undefined][]
 */
export const emptyArrays = (keywordNode) => {
  const keywordUri = /** @type string */ (keywordNode.keywordUri);
  const valueNode = keywordNode.children[1];
  if (arrays.has(keywordUri)) {
    return isEmptyArray(valueNode) ? [[valueNode, undefined]] : [];
  } else if (mapsOfArrays.has(keywordUri) && valueNode.jsonType === "object") {
    return valueNode.children
      .filter((property) => isEmptyArray(property.children[1]))
      .map((property) => [property.children[1], property.children[0].value]);
  } else {
    return [];
  }
};

/** @type (node: JsonSchemaNode) => boolean */
const isEmptyArray = (node) => node.jsonType === "array" && node.children.length === 0;
