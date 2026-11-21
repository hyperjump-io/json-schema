import { visit } from "unist-util-visit";
import { encodeIriFragment } from "@hyperjump/uri";
import { documentForLint } from "../document.js";
import { lintRule } from "../lint-rule.js";

/**
 * @import { JsonSchemaDocumentNode, JsonSchemaKeywordNode } from "../../schema/schema-ast.d.ts"
 */

const definitionsUri = "https://json-schema.org/keyword/definitions";
const unknownUris = new Set(["definitions", "$defs"].map((name) => `https://json-schema.org/keyword/unknown#${encodeIriFragment(name)}`));

/** @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void> */
const misnamedDefinitions = lintRule({ origin: "json-schema-lint:misnamed-definitions", url: "https://hyperjump.io/json-schema/linting/rules/misnamed-definitions/" }, async (tree, file) => {
  const document = await documentForLint(tree, file);
  if (document === undefined) {
    return;
  }

  /** @type [JsonSchemaKeywordNode, string][] */
  const found = [];
  visit(tree, "json-schema", (schemaNode) => {
    // A draft-04–07 reference's properties aren't keywords
    if (schemaNode.type !== "json-schema" || schemaNode.jsonType !== "object") {
      return;
    }

    for (const keywordNode of /** @type JsonSchemaKeywordNode[] */ (schemaNode.children)) {
      if (unknownUris.has(keywordNode.keywordUri)) {
        found.push([keywordNode, schemaNode.dialectUri]);
      }
    }
  });

  for (const [keywordNode, dialectUri] of found) {
    const dialect = document.dialects.get(dialectUri);
    if (dialect === undefined) {
      continue;
    }

    const { keywords, unknownKeywords } = dialect;
    // The resolver reports unknown keywords where they aren't allowed
    const definitionsName = Object.keys(keywords).find((name) => keywords[name] === definitionsUri);
    if (unknownKeywords === "error" || definitionsName === undefined) {
      continue;
    }

    const name = keywordNode.children[0].value;
    file.message(`'${name}' isn't a keyword in this dialect, so what's in it isn't a schema, and references to it don't find one. Use '${definitionsName}'.`, { place: keywordNode.position });
  }
});

export default misnamedDefinitions;
