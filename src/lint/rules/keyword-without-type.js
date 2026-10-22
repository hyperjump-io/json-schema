import { lintRule } from "../lint-rule.js";
import { isNegated, schemaGroup } from "../schema-group.js";
import { findKeyword, keywordType, visitSchemas } from "../utilities.js";

/**
 * @import { JsonSchemaDocumentNode, JsonSchemaKeywordNode, JsonSchemaNode } from "../../schema/schema-ast.d.ts"
 * @import { SchemaGroup } from "../schema-group.d.ts"
 */

const keyword = "https://json-schema.org/keyword";

/** Keywords that say what type a value is */
const typingUris = ["type", "draft-2020-12/type", "const", "enum", "draft-04/enum"].map((name) => `${keyword}/${name}`);

const plurals = { number: "numbers", string: "strings", array: "arrays", object: "objects" };

/** @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void> */
const keywordWithoutType = lintRule({ origin: "jsonschema-lint:keyword-without-type" }, async (tree, file) => {
  /** @type JsonSchemaNode[] */
  const schemas = [];
  visitSchemas(tree, (schemaNode) => {
    schemas.push(schemaNode);
  });

  // The first keyword for one type in each group, which is reported once
  /** @type Map<SchemaGroup, JsonSchemaKeywordNode> */
  const firsts = new Map();
  for (const schemaNode of schemas) {
    if (schemaNode.jsonType !== "object") {
      continue;
    }

    const keywordNode = (/** @type JsonSchemaKeywordNode[] */ (schemaNode.children))
      .find((property) => keywordType(property.keywordUri) !== undefined);
    if (keywordNode === undefined) {
      continue;
    }

    const group = await schemaGroup(file.data.jsonSchemaSession, tree, schemaNode);

    // A group that nothing here applies is used from other documents, which
    // may say what type it is. A keyword in a `not` rejects the type it's for,
    // so other types are already valid.
    if (group.unknown || !group.applied || isNegated(group, schemaNode)) {
      continue;
    }

    const first = firsts.get(group);
    if (first === undefined || /** @type number */ (keywordNode.position?.start.offset) < /** @type number */ (first.position?.start.offset)) {
      firsts.set(group, keywordNode);
    }
  }

  for (const [group, keywordNode] of firsts) {
    // A schema that's a reference (draft-04 through draft-07) ignores what's
    // next to it
    const typed = group.schemas.some((member) => {
      return member.type === "json-schema" && typingUris.some((uri) => findKeyword(member, uri) !== undefined);
    });
    if (!typed) {
      const name = keywordNode.children[0].value;
      const type = /** @type keyof typeof plurals */ (keywordType(keywordNode.keywordUri));
      file.message(`'${name}' applies only to ${plurals[type]}, but there's no 'type', so values of other types are valid`, { place: keywordNode.position });
    }
  }
});

export default keywordWithoutType;
