import { lintRule } from "../lint-rule.js";
import { visitSchemas } from "../utilities.js";

/**
 * @import { JsonSchemaDocumentNode, JsonSchemaKeywordNode } from "../../schema/schema-ast.d.ts"
 * @import { Dialect } from "../../dialect.d.ts"
 */

const enumUris = new Set(["enum", "draft-04/enum"].map((name) => `https://json-schema.org/keyword/${name}`));
const constUri = "https://json-schema.org/keyword/const";

/** @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void> */
const singleValueEnum = lintRule({ origin: "jsonschema-lint:single-value-enum", url: "https://hyperjump.io/json-schema/linting/rules/single-value-enum/" }, async (tree, file) => {
  const session = file.data.jsonSchemaSession;
  if (session === undefined) {
    return;
  }

  /** @type [JsonSchemaKeywordNode, string][] */
  const found = [];
  visitSchemas(tree, (schemaNode) => {
    if (schemaNode.type !== "json-schema" || schemaNode.jsonType !== "object") {
      return;
    }

    const keywordNodes = /** @type JsonSchemaKeywordNode[] */ (schemaNode.children);
    // `const-and-enum` reports `enum` next to `const`
    if (keywordNodes.some((keywordNode) => keywordNode.keywordUri === constUri)) {
      return;
    }

    for (const keywordNode of keywordNodes) {
      const valueNode = keywordNode.children[1];
      if (enumUris.has(keywordNode.keywordUri) && valueNode.jsonType === "array" && valueNode.children.length === 1) {
        found.push([keywordNode, schemaNode.dialectUri]);
      }
    }
  });

  /** @type Map<string, Promise<Dialect>> */
  const dialects = new Map();
  for (const [keywordNode, dialectUri] of found) {
    let dialect = dialects.get(dialectUri);
    if (dialect === undefined) {
      dialect = session.getDialect(dialectUri);
      dialects.set(dialectUri, dialect);
    }

    // Draft-04 doesn't have `const`
    const { keywords } = await dialect;
    const constName = Object.keys(keywords).find((name) => keywords[name] === constUri);
    if (constName !== undefined) {
      const name = keywordNode.children[0].value;
      file.message(`'${name}' has only one value. Use '${constName}' instead.`, { place: keywordNode.position });
    }
  }
});

export default singleValueEnum;
