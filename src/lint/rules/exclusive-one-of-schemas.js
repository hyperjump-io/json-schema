import { documentForLint } from "../document.js";
import { lintRule } from "../lint-rule.js";
import { exclusiveSchemas } from "../redundant-schemas.js";

/**
 * @import { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts"
 * @import { Dialect } from "../../dialect.d.ts"
 */

const anyOfUri = "https://json-schema.org/keyword/anyOf";

/**
 * The schemas are what `one` applies, compared by what they lower to
 * (`exclusiveSchemas`), so no keyword is named, except the one it suggests
 * instead, in the dialect's own name.
 *
 * @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void>
 */
const exclusiveOneOfSchemas = lintRule({ origin: "json-schema-lint:exclusive-one-of-schemas", url: "https://hyperjump.io/json-schema/linting/rules/exclusive-one-of-schemas/" }, async (tree, file) => {
  const document = await documentForLint(tree, file);
  if (document === undefined) {
    return;
  }

  for (const { schemaNode, keywordNode } of exclusiveSchemas(document)) {
    const dialect = schemaNode.type === "json-schema" ? document.dialects.get(schemaNode.dialectUri) : undefined;
    const anyOf = dialect && nameOf(dialect, anyOfUri);
    if (anyOf !== undefined) {
      const name = keywordNode.children[0].value;
      file.message(`No value matches more than one schema in '${name}', so '${anyOf}' means the same`, { place: keywordNode.position });
    }
  }
});

export default exclusiveOneOfSchemas;

/** @type (dialect: Dialect, uri: string) => string | undefined */
const nameOf = ({ keywords }, uri) => Object.keys(keywords).find((name) => keywords[name] === uri);
