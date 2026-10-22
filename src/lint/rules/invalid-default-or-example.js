import { lintRule } from "../lint-rule.js";
import { findKeyword, visitSchemas } from "../utilities.js";

/**
 * @import { JsonSchemaDocumentNode, JsonSchemaKeywordNode, JsonSchemaNode, JsonSchemaTolerantNode } from "../../schema/schema-ast.d.ts"
 * @import { Validator } from "../../json-schema.d.ts"
 */

const defaultUri = "https://json-schema.org/keyword/default";
const examplesUri = "https://json-schema.org/keyword/examples";

/**
 * @typedef {{ schemaNode: JsonSchemaNode; defaultNode?: JsonSchemaKeywordNode; examplesNode?: JsonSchemaKeywordNode }} Annotated
 */

/** @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void> */
const invalidDefaultOrExample = lintRule({ origin: "jsonschema-lint:invalid-default-or-example" }, async (tree, file) => {
  const session = file.data.jsonSchemaSession;
  if (session === undefined) {
    // The schema wasn't resolved, so it can't be compiled
    return;
  }

  /** @type Annotated[] */
  const annotated = [];
  visitSchemas(tree, (schemaNode) => {
    const defaultNode = findKeyword(schemaNode, defaultUri);
    const examplesNode = findKeyword(schemaNode, examplesUri);
    if (defaultNode !== undefined || examplesNode !== undefined) {
      annotated.push({ schemaNode, defaultNode, examplesNode });
    }
  });

  for (const { schemaNode, defaultNode, examplesNode } of annotated) {
    /** @type Validator */
    let validator;
    try {
      validator = await session.compile(schemaNode.location);
    } catch {
      // A schema that can't be compiled, such as one with a reference that
      // can't be retrieved, is reported by other rules, if at all
      continue;
    }

    /** @type (valueNode: JsonSchemaTolerantNode) => boolean */
    const isValid = (valueNode) => validator.validateNode(valueNode);

    if (defaultNode !== undefined && !isValid(defaultNode.children[1])) {
      const name = defaultNode.children[0].value;
      file.message(`The '${name}' value isn't valid against the schema it's in`, { place: defaultNode.children[1].position });
    }

    const examplesValue = examplesNode?.children[1];
    if (examplesValue?.jsonType === "array") {
      for (const itemNode of examplesValue.children) {
        if (!isValid(itemNode)) {
          file.message("This example isn't valid against the schema it's in", { place: itemNode.position });
        }
      }
    }
  }
});

export default invalidDefaultOrExample;
