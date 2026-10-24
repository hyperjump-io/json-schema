import { jsonValue } from "@hyperjump/browser/json";
import { astInstance, jsInstance } from "../evaluate/instance.js";
import { isErrorNode } from "../keywords/checks.js";
import { instanceEqual } from "../keywords/utilities.js";
import { SchemaRegistry } from "../registry/schema-registry.js";
import { findKeyword, visitSchemas } from "./utilities.js";

/**
 * @import { Json } from "@hyperjump/browser/json"
 * @import { InstanceNode } from "../evaluate/instance.js"
 * @import { JsonSchemaDocumentNode, JsonSchemaKeywordNode, JsonSchemaNode, JsonSchemaTolerantNode } from "../schema/schema-ast.d.ts"
 * @import { JsonSchemaSession } from "../session.d.ts"
 */

/**
 * A `const` or `enum` and an assertion next to it, with whether each value
 * passes the assertion
 *
 * @typedef {{
 *   valuesNode: JsonSchemaKeywordNode;
 *   isConst: boolean;
 *   assertionNode: JsonSchemaKeywordNode;
 *   results: [JsonSchemaTolerantNode, boolean][];
 * }} AssertionResult
 */

const keyword = "https://json-schema.org/keyword";
const constUri = `${keyword}/const`;
const enumUris = [`${keyword}/enum`, `${keyword}/draft-04/enum`];

/**
 * Keywords that assert something about a value on their own, apart from the
 * siblings they declare. `type` is left to the rules for it, and `format`
 * only asserts if formats are validated.
 */
const assertionUris = new Set([
  "maximum", "minimum", "exclusiveMaximum", "exclusiveMinimum", "draft-04/maximum", "draft-04/minimum", "multipleOf",
  "maxLength", "minLength", "pattern",
  "maxItems", "minItems", "uniqueItems",
  "maxProperties", "minProperties", "required", "draft-04/required", "dependentRequired"
].map((name) => `${keyword}/${name}`));

/**
 * Results are found once for each tree, so rules share them
 *
 * @type WeakMap<JsonSchemaDocumentNode, Promise<AssertionResult[]>>
 */
const cache = new WeakMap();

/**
 * Each value of every `const` and `enum` in the document, evaluated against
 * each assertion next to it, one at a time. Each assertion is compiled in a
 * schema of its own, with its siblings, so what it says about the values
 * doesn't depend on the rest of the schema. An assertion with its default
 * value isn't included, because `keyword-with-default-value` reports it,
 * and neither is a schema with both `const` and `enum`, which
 * `const-and-enum` reports.
 *
 * @type (session: JsonSchemaSession, tree: JsonSchemaDocumentNode) => Promise<AssertionResult[]>
 */
export const constOrEnumAssertions = (session, tree) => {
  let results = cache.get(tree);
  if (results === undefined) {
    results = evaluate(session, tree);
    cache.set(tree, results);
  }
  return results;
};

/** @type (session: JsonSchemaSession, tree: JsonSchemaDocumentNode) => Promise<AssertionResult[]> */
const evaluate = async (session, tree) => {
  const { jsonSchema } = session;

  /** @type {{ schemaNode: JsonSchemaNode; dialectUri: string; valuesNode: JsonSchemaKeywordNode; isConst: boolean }[]} */
  const found = [];
  visitSchemas(tree, (schemaNode) => {
    if (schemaNode.type !== "json-schema") {
      return;
    }

    const constNode = findKeyword(schemaNode, constUri);
    const enumNodes = enumUris.map((uri) => findKeyword(schemaNode, uri)).filter((node) => node !== undefined);
    if (constNode !== undefined && enumNodes.length === 0) {
      found.push({ schemaNode, dialectUri: schemaNode.dialectUri, valuesNode: constNode, isConst: true });
    } else if (constNode === undefined && enumNodes.length === 1 && enumNodes[0].children[1].jsonType === "array") {
      found.push({ schemaNode, dialectUri: schemaNode.dialectUri, valuesNode: enumNodes[0], isConst: false });
    }
  });

  /** @type AssertionResult[] */
  const results = [];
  for (const { schemaNode, dialectUri, valuesNode, isConst } of found) {
    // Values that couldn't be parsed aren't evaluated
    const valuesValue = valuesNode.children[1];
    /** @type JsonSchemaTolerantNode[] */
    const allValueNodes = isConst ? [valuesValue] : valuesValue.jsonType === "array" ? valuesValue.children : [];
    const valueNodes = allValueNodes.filter((valueNode) => !isErrorNode(valueNode));

    const keywordNodes = /** @type JsonSchemaKeywordNode[] */ (schemaNode.jsonType === "object" ? schemaNode.children : []);
    for (const assertionNode of keywordNodes) {
      const uri = assertionNode.keywordUri;
      if (!assertionUris.has(uri) || !jsonSchema.hasKeyword(uri)) {
        continue;
      }

      const definition = jsonSchema.getKeyword(uri);
      const assertionValue = /** @type InstanceNode */ (assertionNode.children[1]);
      if (definition.default !== undefined && instanceEqual(astInstance, assertionValue, jsInstance, definition.default, false)) {
        continue;
      }

      // The assertion and the siblings it reads, in a schema of their own
      const schemaKeywordNodes = [assertionNode, ...Object.values(definition.siblings ?? {}).map((siblingUri) => findKeyword(schemaNode, siblingUri))];
      let validator;
      try {
        /** @type Record<string, Json> */
        const schema = { $schema: dialectUri };
        for (const keywordNode of schemaKeywordNodes) {
          if (keywordNode !== undefined) {
            schema[keywordNode.children[0].value] = jsonValue(keywordNode.children[1]);
          }
        }

        const retrievalUri = "https://lint.invalid/assertion.schema.json";
        const registry = new SchemaRegistry([{ schema, retrievalUri }]);
        validator = await jsonSchema.session({ registries: [registry] }).compile(retrievalUri);
      } catch {
        // A value the keyword's check rejects, including one that couldn't
        // be parsed, is reported by the resolver
        continue;
      }

      results.push({
        valuesNode,
        isConst,
        assertionNode,
        results: valueNodes.map((valueNode) => [valueNode, validator.validateNode(valueNode)])
      });
    }
  }

  return results;
};
