import { lintRule } from "../lint-rule.js";
import { findKeyword, typeNames, visitSchemas } from "../utilities.js";

/**
 * @import { JsonSchemaDocumentNode, JsonSchemaKeywordNode, JsonSchemaNode } from "../../schema/schema-ast.d.ts"
 * @import { Dialect } from "../../dialect.d.ts"
 */

const keyword = "https://json-schema.org/keyword";
const constUri = `${keyword}/const`;
const enumUris = [`${keyword}/enum`, `${keyword}/draft-04/enum`];

/** Inclusive limits, and draft-04's, which a sibling boolean makes exclusive */
const limitPairs = [
  [`${keyword}/minimum`, `${keyword}/maximum`],
  [`${keyword}/draft-04/minimum`, `${keyword}/draft-04/maximum`, `${keyword}/draft-04/exclusiveMinimum`, `${keyword}/draft-04/exclusiveMaximum`]
];

/** @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void> */
const singleValueRange = lintRule({ origin: "jsonschema-lint:single-value-range" }, async (tree, file) => {
  const session = file.data.jsonSchemaSession;
  if (session === undefined) {
    return;
  }

  /** @type [JsonSchemaKeywordNode, JsonSchemaKeywordNode, number, string][] */
  const found = [];
  visitSchemas(tree, (schemaNode) => {
    if (schemaNode.type !== "json-schema") {
      return;
    }

    // Values of other types are valid, which `const` wouldn't allow
    const type = typeNames(schemaNode);
    if (type === undefined || [...type.names].some((name) => name !== "number" && name !== "integer")) {
      return;
    }

    for (const [minimumUri, maximumUri, exclusiveMinimumUri, exclusiveMaximumUri] of limitPairs) {
      const minimumNode = findKeyword(schemaNode, minimumUri);
      const maximumNode = findKeyword(schemaNode, maximumUri);
      const minimumValueNode = minimumNode?.children[1];
      const maximumValueNode = maximumNode?.children[1];
      // With an exclusive limit, nothing is valid, which contradictory-limits reports
      if (minimumNode === undefined || maximumNode === undefined
        || minimumValueNode?.jsonType !== "number" || maximumValueNode?.jsonType !== "number"
        || minimumValueNode.value !== maximumValueNode.value
        || isTrue(schemaNode, exclusiveMinimumUri) || isTrue(schemaNode, exclusiveMaximumUri)) {
        continue;
      }

      found.push([minimumNode, maximumNode, minimumValueNode.value, schemaNode.dialectUri]);
    }
  });

  /** @type Map<string, Promise<Dialect>> */
  const dialects = new Map();
  for (const [minimumNode, maximumNode, value, dialectUri] of found) {
    let dialect = dialects.get(dialectUri);
    if (dialect === undefined) {
      dialect = session.getDialect(dialectUri);
      dialects.set(dialectUri, dialect);
    }

    // Draft-04 doesn't have `const`
    const constName = nameOf(await dialect, [constUri]);
    const enumName = nameOf(await dialect, enumUris);
    const replacement = constName !== undefined ? `'${constName}': ${value}` : enumName !== undefined ? `'${enumName}': [${value}]` : undefined;
    if (replacement === undefined) {
      continue;
    }

    const minimumName = minimumNode.children[0].value;
    const maximumName = maximumNode.children[0].value;
    // The message goes on whichever comes second
    const place = /** @type number */ (minimumNode.position?.start.offset) < /** @type number */ (maximumNode.position?.start.offset)
      ? maximumNode.position
      : minimumNode.position;
    file.message(`'${minimumName}' and '${maximumName}' are both ${value}, so it's the only valid value. Use ${replacement} instead.`, { place });
  }
});

export default singleValueRange;

/** @type (schemaNode: JsonSchemaNode, uri: string | undefined) => boolean */
const isTrue = (schemaNode, uri) => {
  const valueNode = uri === undefined ? undefined : findKeyword(schemaNode, uri)?.children[1];
  return valueNode?.jsonType === "boolean" && valueNode.value;
};

/** @type (dialect: Dialect, uris: string[]) => string | undefined */
const nameOf = ({ keywords }, uris) => Object.keys(keywords).find((name) => uris.includes(keywords[name]));
