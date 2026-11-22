import { visit } from "unist-util-visit";
import { lintRule } from "../lint-rule.js";

/**
 * @import { JsonSchemaDocumentNode, JsonSchemaKeywordNode } from "../../schema/schema-ast.d.ts"
 */

/**
 * `$schema` decides the dialect, which is what makes `$ref` replace the
 * schema, so it isn't ignored. A comment never has an effect, so it isn't a
 * surprise that it's ignored.
 */
const notReported = new Set(["$ref", "$schema", "$comment"]);

/**
 * `definitions` is ignored too, but the resolver still finds its schemas,
 * because tools generate a `$ref` to one of them next to it. Other
 * implementations might not, so it's still reported.
 */
const definitionsUri = "https://json-schema.org/keyword/definitions";

/** @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void> */
const ignoredRefSiblings = lintRule({ origin: "json-schema-lint:ignored-ref-siblings", url: "https://hyperjump.io/json-schema/linting/rules/ignored-ref-siblings/" }, (tree, file) => {
  visit(tree, "reference", (node) => {
    // Only a schema that's a reference (draft-04 through draft-07). A `$ref`
    // keyword's value is a string.
    if (node.type !== "reference" || node.jsonType !== "object") {
      return;
    }

    for (const property of /** @type JsonSchemaKeywordNode[] */ (node.children)) {
      const name = property.children[0].value;
      if (property.keywordUri === definitionsUri) {
        file.message(`'${name}' is ignored, because '$ref' replaces the schema it's in, so an implementation might not find its schemas. Wrap the '$ref' in an 'allOf'.`, { place: property.position });
      } else if (!notReported.has(name)) {
        file.message(`'${name}' is ignored, because '$ref' replaces the schema it's in`, { place: property.position });
      }
    }
  });
});

export default ignoredRefSiblings;
