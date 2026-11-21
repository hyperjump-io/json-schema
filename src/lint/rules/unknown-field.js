import { lintRule } from "../lint-rule.js";
import { visitKeywords } from "../utilities.js";

/**
 * @import { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts"
 */

/**
 * The OpenAPI objects that are keyword values, by keyword URI, with the
 * fields each defines. `x-` fields are Specification Extensions, which
 * every one allows.
 *
 * @type Record<string, { object: string; fields: string[] }>
 */
const objects = {
  "https://spec.openapis.org/oas/3.1/keyword/discriminator": {
    object: "Discriminator Object",
    fields: ["propertyName", "mapping"]
  },
  "https://spec.openapis.org/oas/3.2/keyword/discriminator": {
    object: "Discriminator Object",
    fields: ["propertyName", "mapping", "defaultMapping"]
  },
  "https://spec.openapis.org/oas/3.2/keyword/externalDocs": {
    object: "External Documentation Object",
    fields: ["description", "url"]
  },
  "https://spec.openapis.org/oas/3.1/keyword/xml": {
    object: "XML Object",
    fields: ["name", "namespace", "prefix", "attribute", "wrapped"]
  },
  "https://spec.openapis.org/oas/3.2/keyword/xml": {
    object: "XML Object",
    fields: ["nodeType", "name", "namespace", "prefix", "attribute", "wrapped"]
  }
};

/** @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void> */
const unknownField = lintRule({ origin: "json-schema-lint:unknown-field", url: "https://hyperjump.io/json-schema/linting/rules/unknown-field/" }, (tree, file) => {
  for (const [keywordUri, { object, fields }] of Object.entries(objects)) {
    visitKeywords(tree, keywordUri, (keywordNode) => {
      const valueNode = keywordNode.children[1];
      if (valueNode.jsonType !== "object") {
        // The keyword's check reports it
        return;
      }

      for (const propertyNode of valueNode.children) {
        const nameNode = propertyNode.children[0];
        const name = nameNode.value;
        if (fields.includes(name) || name.startsWith("x-")) {
          continue;
        }

        const field = fields.find((field) => field.toLowerCase() === name.toLowerCase());
        const suggestion = field === undefined ? "" : ` Did you mean '${field}'?`;
        file.message(`'${name}' isn't a field of the ${object}, so tools ignore it.${suggestion}`, { place: nameNode.position });
      }
    });
  }
});

export default unknownField;
