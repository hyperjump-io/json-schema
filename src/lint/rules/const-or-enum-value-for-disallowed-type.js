import { typeIsOf } from "../analysis.js";
import { constOrEnumKeywords } from "../const-or-enum-keywords.js";
import { lintRule } from "../lint-rule.js";
import { lowerForLint } from "../lower.js";

/**
 * @import { JsonSchemaDocumentNode, JsonSchemaKeywordNode, JsonSchemaTolerantNode } from "../../schema/schema-ast.d.ts"
 * @import { TypeName } from "../../kernel/kernel.d.ts"
 */

/** @type Record<string, string> */
const typeDescriptions = {
  null: "null",
  boolean: "a boolean",
  number: "a number",
  string: "a string",
  array: "an array",
  object: "an object"
};

/**
 * `type` is a keyword that lowers to `typeIs`, and whether it allows a
 * value is from evaluating it (`constOrEnumKeywords`), so no keyword is
 * named.
 *
 * @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void>
 */
const constOrEnumValueForDisallowedType = lintRule({ origin: "json-schema-lint:const-or-enum-value-for-disallowed-type", url: "https://hyperjump.io/json-schema/linting/rules/const-or-enum-value-for-disallowed-type/" }, async (tree, file) => {
  const session = file.data.jsonSchemaSession;
  if (session === undefined) {
    return;
  }

  // The types each `typeIs` allows, to say why a value isn't allowed
  /** @type Map<JsonSchemaKeywordNode, Set<TypeName>> */
  const typesOf = new Map();
  for (const keywords of (await lowerForLint(session, tree)).values()) {
    for (const keyword of keywords) {
      const type = typeIsOf([keyword]);
      if (type !== undefined) {
        typesOf.set(type.keywordNode, type.types);
      }
    }
  }

  for (const { valuesNode, isConst, keywordNode, isType, results } of await constOrEnumKeywords(session, tree)) {
    if (!isType) {
      continue;
    }

    const typeName = keywordNode.children[0].value;
    const types = typesOf.get(keywordNode) ?? new Set();
    for (const [valueNode, { valid }] of results) {
      if (valid !== false) {
        continue;
      }

      const description = describe(types, valueNode);
      if (isConst) {
        const constName = valuesNode.children[0].value;
        file.message(`The '${constName}' value is ${description}, which '${typeName}' doesn't allow, so nothing is valid`, { place: valuesNode.position });
      } else {
        file.message(`This value is ${description}, which '${typeName}' doesn't allow, so it's never valid`, { place: valueNode.position });
      }
    }
  }
});

export default constOrEnumValueForDisallowedType;

/**
 * What a value's type is. It says a number isn't an integer if `type`
 * allows integers, since that's why it isn't allowed.
 *
 * @type (names: Set<TypeName>, valueNode: JsonSchemaTolerantNode) => string
 */
const describe = (names, valueNode) => {
  const jsonType = /** @type string */ (/** @type any */ (valueNode).jsonType);
  return jsonType === "number" && names.has("integer") ? "a number that isn't an integer" : typeDescriptions[jsonType];
};
