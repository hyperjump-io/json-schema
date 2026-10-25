import { constOrEnumKeywords } from "../const-or-enum-keywords.js";
import { lintRule } from "../lint-rule.js";

/**
 * @import { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts"
 */

/** @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void> */
const keywordImpliedByConstOrEnum = lintRule({ origin: "jsonschema-lint:keyword-implied-by-const-or-enum", url: "https://hyperjump.io/json-schema/linting/rules/keyword-implied-by-const-or-enum/" }, async (tree, file) => {
  const session = file.data.jsonSchemaSession;
  if (session === undefined) {
    return;
  }

  for (const { valuesNode, isConst, keywordNode, results, marksAreRead } of await constOrEnumKeywords(session, tree)) {
    // A keyword that annotates a value, or marks something in it that might
    // be read, has an effect even if it allows every value
    const noEffect = results.every(([, { valid, annotates, marks }]) => valid === true && !annotates && !(marks && marksAreRead));
    if (results.length === 0 || !noEffect) {
      continue;
    }

    const name = keywordNode.children[0].value;
    const valuesName = valuesNode.children[0].value;
    const values = isConst ? `the '${valuesName}' value` : `every value in '${valuesName}'`;
    file.message(`'${name}' has no effect, because it allows ${values}`, { place: keywordNode.position });
  }
});

export default keywordImpliedByConstOrEnum;
