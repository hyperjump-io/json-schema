import { constOrEnumKeywords } from "../const-or-enum-keywords.js";
import { documentForLint } from "../document.js";
import { lintRule } from "../lint-rule.js";
import { list } from "../list.js";

/**
 * @import { JsonSchemaDocumentNode, JsonSchemaTolerantNode } from "../../schema/schema-ast.d.ts"
 */

/** @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void> */
const constOrEnumValueRejected = lintRule({ origin: "json-schema-lint:const-or-enum-value-rejected", url: "https://hyperjump.io/json-schema/linting/rules/const-or-enum-value-rejected/" }, async (tree, file) => {
  const document = await documentForLint(tree, file);
  if (document === undefined) {
    return;
  }

  // The keywords that reject each value, so each value is reported once.
  // A value a keyword might reject isn't reported.
  /** @type Map<JsonSchemaTolerantNode, { isConst: boolean; valuesName: string; names: string[] }> */
  const rejected = new Map();
  for (const { valuesNode, isConst, keywordNode, isType, results } of constOrEnumKeywords(document)) {
    // A value `type` doesn't allow is const-or-enum-value-for-disallowed-type's
    if (isType) {
      continue;
    }

    for (const [valueNode, { valid }] of results) {
      if (valid === false) {
        const entry = rejected.get(valueNode) ?? { isConst, valuesName: valuesNode.children[0].value, names: [] };
        entry.names.push(`'${keywordNode.children[0].value}'`);
        rejected.set(valueNode, entry);
      }
    }
  }

  for (const [valueNode, { isConst, valuesName, names }] of rejected) {
    const keywords = list(names);
    const verb = names.length === 1 ? "rejects" : "reject";
    if (isConst) {
      file.message(`${keywords} ${verb} the '${valuesName}' value, so nothing is valid`, { place: valueNode.position });
    } else {
      file.message(`${keywords} ${verb} this value, so it's never valid`, { place: valueNode.position });
    }
  }
});

export default constOrEnumValueRejected;
