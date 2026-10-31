import { keywordAppliesTo, typeIsOf } from "../analysis.js";
import { namesOf } from "../bounds.js";
import { formatTypes } from "../format-types.js";
import { documentForLint } from "../document.js";
import { lintRule } from "../lint-rule.js";

/**
 * @import { JsonSchemaDocumentNode, JsonSchemaKeywordNode } from "../../schema/schema-ast.d.ts"
 * @import { TypeName } from "../../kernel/kernel.d.ts"
 */

const plurals = {
  null: "null",
  boolean: "booleans",
  number: "numbers",
  string: "strings",
  array: "arrays",
  object: "objects"
};

/** @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void> */
const keywordForDisallowedType = lintRule({ origin: "json-schema-lint:keyword-for-disallowed-type", url: "https://hyperjump.io/json-schema/linting/rules/keyword-for-disallowed-type/" }, async (tree, file) => {
  const document = await documentForLint(tree, file);
  if (document === undefined) {
    return;
  }

  for (const [schemaNode, keywords] of document.schemas) {
    const type = typeIsOf(keywords);
    // If they allow no type together, every keyword would be reported
    if (type === undefined || type.types.size === 0 || schemaNode.jsonType !== "object") {
      continue;
    }

    const allowed = allowedTypes(type.types);
    const allowedBy = type.keywords.map(({ keywordNode, types }) => ({ keywordNode, allowed: allowedTypes(types) }));

    // The keywords that don't allow some of the types, which is why none is allowed
    /** @type (types: string[]) => string */
    const disallowedBy = (types) => {
      const keywordNodes = allowedBy
        .filter((keyword) => types.some((type) => !keyword.allowed.has(type)))
        .map(({ keywordNode }) => keywordNode);
      return `${namesOf(keywordNodes)} ${keywordNodes.length === 1 ? "doesn't" : "don't"} allow`;
    };

    for (const keywordNode of /** @type JsonSchemaKeywordNode[] */ (schemaNode.children)) {
      // A format that could apply to any type isn't reported
      const types = formatTypes(document, schemaNode, keywordNode);
      const formatNode = keywordNode.children[1];
      if (types !== undefined && formatNode.jsonType === "string") {
        if (!types.some((type) => allowed.has(type))) {
          const format = formatNode.value;
          const typeList = types.map((type) => plurals[type]).join(" or ");
          file.message(`The '${format}' format applies only to ${typeList}, which ${disallowedBy(types)}`, { place: keywordNode.position });
        }
        continue;
      }

      // A keyword with no effect applies to nothing, which other rules report
      const applies = keywordAppliesTo(document, keywords, keywordNode);
      if (applies.length > 0 && !applies.some((type) => allowed.has(type))) {
        const name = keywordNode.children[0].value;
        const typeList = applies.map((type) => plurals[type]).join(" or ");
        file.message(`'${name}' applies only to ${typeList}, which ${disallowedBy(applies)}`, { place: keywordNode.position });
      }
    }
  }
});

export default keywordForDisallowedType;

/**
 * The types of value a `typeIs`'s types allow some of. `integer` allows
 * some numbers.
 *
 * @type (types: Set<TypeName>) => Set<string>
 */
const allowedTypes = (types) => {
  /** @type Set<string> */
  const allowed = new Set(types);
  if (allowed.has("integer")) {
    allowed.add("number");
  }
  return allowed;
};
