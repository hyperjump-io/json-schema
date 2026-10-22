import { lintRule } from "../lint-rule.js";
import { visitKeywords, visitReferences } from "../utilities.js";

/**
 * @import { JsonSchemaDocumentNode, JsonSchemaKeywordNode, JsonSchemaNode } from "../../schema/schema-ast.d.ts"
 * @import { VFile } from "vfile"
 */

const schemaUri = "https://json-schema.org/keyword/schema";

/** Each official dialect's URI as its meta-schema identifies itself, by the URI without a fragment */
const canonicalUris = new Map([
  "http://json-schema.org/draft-04/schema#",
  "http://json-schema.org/draft-06/schema#",
  "http://json-schema.org/draft-07/schema#",
  "https://json-schema.org/draft/2019-09/schema",
  "https://json-schema.org/draft/2020-12/schema"
].map((uri) => [uri.replace(/#$/, ""), uri]));

/** @type (valueNode: JsonSchemaNode, file: VFile) => void */
const check = (valueNode, file) => {
  if (valueNode.jsonType !== "string") {
    return;
  }

  const canonicalUri = canonicalUris.get(valueNode.value.replace(/#$/, ""));
  if (canonicalUri !== undefined && valueNode.value !== canonicalUri) {
    file.message(`'${valueNode.value}' should be '${canonicalUri}', the URI its meta-schema identifies itself with. Implementations that compare dialect URIs as strings won't recognize it.`, { place: valueNode.position });
  }
};

/** @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void> */
const nonCanonicalDialectUri = lintRule({ origin: "jsonschema-lint:non-canonical-dialect-uri" }, (tree, file) => {
  visitKeywords(tree, schemaUri, (keywordNode) => {
    check(keywordNode.children[1], file);
  });

  // In draft-04 through draft-07, a schema with `$ref` is a reference, whose
  // properties aren't keywords, but `$schema` still decides its dialect
  visitReferences(tree, (_uri, node) => {
    if (node.type !== "reference" || node.jsonType !== "object") {
      return;
    }

    for (const property of /** @type JsonSchemaKeywordNode[] */ (node.children)) {
      if (property.children[0].value === "$schema") {
        check(property.children[1], file);
      }
    }
  });
});

export default nonCanonicalDialectUri;
