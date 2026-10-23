import { constOrEnumAssertions } from "../const-or-enum-assertions.js";
import { lintRule } from "../lint-rule.js";

/**
 * @import { JsonSchemaDocumentNode, JsonSchemaTolerantNode } from "../../schema/schema-ast.d.ts"
 */

/** @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void> */
const constOrEnumValueRejected = lintRule({ origin: "jsonschema-lint:const-or-enum-value-rejected" }, async (tree, file) => {
  const session = file.data.jsonSchemaSession;
  if (session === undefined) {
    return;
  }

  // The assertions that reject each value, so each value is reported once
  /** @type Map<JsonSchemaTolerantNode, { isConst: boolean; valuesName: string; names: string[] }> */
  const rejected = new Map();
  for (const { valuesNode, isConst, assertionNode, results } of await constOrEnumAssertions(session, tree)) {
    for (const [valueNode, isValid] of results) {
      if (!isValid) {
        const entry = rejected.get(valueNode) ?? { isConst, valuesName: valuesNode.children[0].value, names: [] };
        entry.names.push(`'${assertionNode.children[0].value}'`);
        rejected.set(valueNode, entry);
      }
    }
  }

  for (const [valueNode, { isConst, valuesName, names }] of rejected) {
    const assertions = names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
    const verb = names.length === 1 ? "rejects" : "reject";
    if (isConst) {
      file.message(`${assertions} ${verb} the '${valuesName}' value, so nothing is valid`, { place: valueNode.position });
    } else {
      file.message(`${assertions} ${verb} this value, so it's never valid`, { place: valueNode.position });
    }
  }
});

export default constOrEnumValueRejected;
