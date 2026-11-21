import { visit } from "unist-util-visit";
import { allowsNothing } from "../allows-nothing.js";
import { operationsOf, propertyOperations } from "../analysis.js";
import { namesOf } from "../bounds.js";
import { documentForLint } from "../document.js";
import { keywordsThatMustPass } from "../in-place.js";
import { lintRule } from "../lint-rule.js";
import { nodeFor } from "../utilities.js";

/**
 * @import { JsonSchemaDocumentNode, JsonSchemaKeywordNode, JsonSchemaNode } from "../../schema/schema-ast.d.ts"
 * @import { MustPass } from "../in-place.js"
 */

/**
 * A required property is `hasProperty`, and what applies to it is
 * `property` and `eachProperty` (`propertyOperations`), so no keyword is
 * named. Schemas that have to pass with the schema, like `allOf`'s and
 * `$ref`'s, count too (`keywordsThatMustPass`). A property required and
 * rejected in the same applied schema is reported there.
 *
 * @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void>
 */
const requiredPropertyNotAllowed = lintRule({ origin: "json-schema-lint:required-property-not-allowed", url: "https://hyperjump.io/json-schema/linting/rules/required-property-not-allowed/" }, async (tree, file) => {
  const document = await documentForLint(tree, file);
  if (document === undefined) {
    return;
  }

  const lowered = document.schemas;
  const schemas = new Map([...lowered].map(([schemaNode, keywords]) => [schemaNode.location, keywords]));

  /** @type Map<string, JsonSchemaNode> */
  const schemaNodes = new Map();
  visit(tree, "json-schema", (node) => {
    const schemaNode = /** @type JsonSchemaNode */ (node);
    schemaNodes.set(schemaNode.location, schemaNode);
  });

  for (const [schemaNode, keywords] of lowered) {
    const mustPass = keywordsThatMustPass(schemaNode, keywords, schemas);
    const mustPassOf = new Map(mustPass.map((entry) => [entry.keyword, entry]));
    const applied = mustPass.map(({ keyword }) => keyword);

    for (const { keyword: { group, keywordNode }, applying, via } of mustPass) {
      for (const operation of operationsOf(group.expression)) {
        if (operation.op !== "hasProperty") {
          continue;
        }

        const rejecting = propertyOperations(applied, operation.name)
          ?.find(({ of }) => allowsNothing(of, schemaNodes, lowered));
        const rejectingEntry = rejecting === undefined ? undefined : /** @type MustPass */ (mustPassOf.get(rejecting.keyword));
        if (rejectingEntry === undefined || (via !== undefined && rejectingEntry.via === via)) {
          continue;
        }

        const required = `'${operation.name}' is required${inApplied(applying)}`;
        const rejectedBy = `'${rejectingEntry.keyword.keywordNode.children[0].value}'${inApplied(rejectingEntry.applying)}`;
        const place = (applying ?? nodeFor(keywordNode, operation.name) ?? keywordNode).position;
        file.message(`${required}, but ${rejectedBy} doesn't allow it, so no object is valid`, { place });
      }
    }
  }
});

export default requiredPropertyNotAllowed;

/**
 * Where a keyword is, if it's in a schema that's applied, like " in 'allOf'"
 *
 * @type (applying: JsonSchemaKeywordNode | undefined) => string
 */
const inApplied = (applying) => applying === undefined ? "" : ` in ${namesOf([applying])}`;
