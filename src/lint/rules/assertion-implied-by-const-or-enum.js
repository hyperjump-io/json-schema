import { constOrEnumAssertions } from "../const-or-enum-assertions.js";
import { lintRule } from "../lint-rule.js";

/**
 * @import { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts"
 */

/** @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void> */
const assertionImpliedByConstOrEnum = lintRule({ origin: "jsonschema-lint:assertion-implied-by-const-or-enum" }, async (tree, file) => {
  const session = file.data.jsonSchemaSession;
  if (session === undefined) {
    return;
  }

  for (const { valuesNode, isConst, assertionNode, results } of await constOrEnumAssertions(session, tree)) {
    if (results.length === 0 || !results.every(([, isValid]) => isValid)) {
      continue;
    }

    const name = assertionNode.children[0].value;
    const valuesName = valuesNode.children[0].value;
    const values = isConst ? `the '${valuesName}' value` : `every value in '${valuesName}'`;
    file.message(`'${name}' has no effect, because it allows ${values}`, { place: assertionNode.position });
  }
});

export default assertionImpliedByConstOrEnum;
