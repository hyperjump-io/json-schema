import { lintRule } from "../lint-rule.js";
import { findKeyword, typeNames, visitSchemas } from "../utilities.js";

/**
 * @import { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts"
 */

const keyword = "https://json-schema.org/keyword";

/**
 * Numeric limits, how each rounds to the integer it's the same as, and the
 * inclusive limit an exclusive one is the same as. Draft-04's exclusive
 * limits are booleans, so its `maximum` and `minimum` aren't here: whether
 * they're exclusive changes the integer.
 *
 * @type [string, (value: number) => number, string?][]
 */
const limits = [
  [`${keyword}/maximum`, Math.floor],
  [`${keyword}/minimum`, Math.ceil],
  [`${keyword}/exclusiveMaximum`, Math.floor, "maximum"],
  [`${keyword}/exclusiveMinimum`, Math.ceil, "minimum"]
];

/** @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void> */
const fractionalLimitForInteger = lintRule({ origin: "jsonschema-lint:fractional-limit-for-integer" }, (tree, file) => {
  visitSchemas(tree, (schemaNode) => {
    // Only numbers that are integers are valid
    const type = typeNames(schemaNode);
    if (!type?.names.has("integer") || type.names.has("number")) {
      return;
    }

    for (const [uri, round, inclusive] of limits) {
      const keywordNode = findKeyword(schemaNode, uri);
      const valueNode = keywordNode?.children[1];
      if (keywordNode === undefined || valueNode?.jsonType !== "number" || Number.isInteger(valueNode.value)) {
        continue;
      }

      const name = keywordNode.children[0].value;
      const typeName = type.keywordNode.children[0].value;
      // An exclusive limit that isn't an integer allows the integer it rounds to
      const integer = round(valueNode.value);
      const sameAs = inclusive === undefined ? `${integer}` : `'${inclusive}': ${integer}`;
      file.message(`'${name}' isn't an integer, but '${typeName}' only allows integers, so it's the same as ${sameAs}`, { place: keywordNode.position });
    }
  });
});

export default fractionalLimitForInteger;
