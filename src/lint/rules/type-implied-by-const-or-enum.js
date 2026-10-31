import { constOrEnumKeywords } from "../const-or-enum-keywords.js";
import { documentForLint } from "../document.js";
import { lintRule } from "../lint-rule.js";

/**
 * @import { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts"
 */

/**
 * `type` is a keyword that lowers to `typeIs`, and whether it allows a
 * value is from evaluating it (`constOrEnumKeywords`), so no keyword is
 * named.
 *
 * @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void>
 */
const typeImpliedByConstOrEnum = lintRule({ origin: "json-schema-lint:type-implied-by-const-or-enum", url: "https://hyperjump.io/json-schema/linting/rules/type-implied-by-const-or-enum/" }, async (tree, file) => {
  const document = await documentForLint(tree, file);
  if (document === undefined) {
    return;
  }

  for (const { valuesNode, isConst, keywordNode, isType, results } of constOrEnumKeywords(document)) {
    // Values `type` doesn't allow are reported by
    // const-or-enum-value-for-disallowed-type. Then `type` has an effect.
    if (!isType || !results.every(([, { valid }]) => valid === true)) {
      continue;
    }

    const typeName = keywordNode.children[0].value;
    const valuesName = valuesNode.children[0].value;
    const values = isConst ? `the '${valuesName}' value` : `every value in '${valuesName}'`;
    file.message(`'${typeName}' has no effect, because it allows ${values}`, { place: keywordNode.position });
  }
});

export default typeImpliedByConstOrEnum;
