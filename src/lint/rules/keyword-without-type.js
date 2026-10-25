import { keywordAppliesTo } from "../analysis.js";
import { formatTypes } from "../format-types.js";
import { lintRule } from "../lint-rule.js";
import { lowerForLint } from "../lower.js";
import { isNegated, schemaGroup } from "../schema-group.js";
import { findKeyword, visitKeywords, visitSchemas } from "../utilities.js";

/**
 * @import { JsonSchemaDocumentNode, JsonSchemaKeywordNode, JsonSchemaNode } from "../../schema/schema-ast.d.ts"
 * @import { SchemaGroup } from "../schema-group.d.ts"
 */

/**
 * A keyword that applies only to some types, and what to call it
 *
 * @typedef {{ keywordNode: JsonSchemaKeywordNode; label: string; types: string[] }} TypedKeyword
 */

const keyword = "https://json-schema.org/keyword";

/** Keywords that say what type a value is */
const typingUris = ["type", "draft-2020-12/type", "const", "enum", "draft-04/enum"].map((name) => `${keyword}/${name}`);

/** @type Record<string, string> */
const plurals = {
  null: "null",
  boolean: "booleans",
  number: "numbers",
  string: "strings",
  array: "arrays",
  object: "objects"
};

/** @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void> */
const keywordWithoutType = lintRule({ origin: "jsonschema-lint:keyword-without-type", url: "https://hyperjump.io/json-schema/linting/rules/keyword-without-type/" }, async (tree, file) => {
  const session = file.data.jsonSchemaSession;
  if (session === undefined) {
    return;
  }

  const lowered = await lowerForLint(session, tree);

  /** @type JsonSchemaNode[] */
  const schemas = [];
  visitSchemas(tree, (schemaNode) => {
    schemas.push(schemaNode);
  });

  // Property names are always strings, so there are no other types to allow
  /** @type Set<JsonSchemaNode> */
  const propertyNamesSchemas = new Set();
  visitKeywords(tree, `${keyword}/propertyNames`, (keywordNode) => {
    propertyNamesSchemas.add(/** @type JsonSchemaNode */ (keywordNode.children[1]));
  });

  // The first keyword for some types in each group, which is reported once
  /** @type Map<SchemaGroup, TypedKeyword> */
  const firsts = new Map();
  for (const schemaNode of schemas) {
    if (schemaNode.jsonType !== "object") {
      continue;
    }

    /** @type TypedKeyword | undefined */
    let typed;
    const keywords = lowered.get(schemaNode) ?? [];
    for (const keywordNode of /** @type JsonSchemaKeywordNode[] */ (schemaNode.children)) {
      // A format that could apply to any type isn't reported
      const formatNode = keywordNode.children[1];
      const types = await formatTypes(session, schemaNode, keywordNode);
      if (types !== undefined && formatNode.jsonType === "string") {
        typed = { keywordNode, label: `The '${formatNode.value}' format`, types };
        break;
      }

      // Neither is a keyword with no effect, which applies to nothing
      const applies = keywordAppliesTo(session.jsonSchema, keywords, keywordNode);
      if (applies.length > 0 && applies.length < Object.keys(plurals).length) {
        typed = { keywordNode, label: `'${keywordNode.children[0].value}'`, types: applies };
        break;
      }
    }
    if (typed === undefined) {
      continue;
    }

    const group = await schemaGroup(session, tree, schemaNode);

    // A group that nothing here applies is used from other documents, which
    // may say what type it is. A keyword in a `not` rejects the type it's for,
    // so other types are already valid. A schema for property names only
    // sees strings.
    if (group.unknown || !group.applied || isNegated(group, schemaNode) || group.schemas.some((member) => propertyNamesSchemas.has(member))) {
      continue;
    }

    const first = firsts.get(group);
    const offset = /** @type number */ (typed.keywordNode.position?.start.offset);
    if (first === undefined || offset < /** @type number */ (first.keywordNode.position?.start.offset)) {
      firsts.set(group, typed);
    }
  }

  for (const [group, { keywordNode, label, types }] of firsts) {
    // A schema that's a reference (draft-04 through draft-07) ignores what's
    // next to it
    const typed = group.schemas.some((member) => {
      return member.type === "json-schema" && typingUris.some((uri) => findKeyword(member, uri) !== undefined);
    });
    if (!typed) {
      const typeList = types.map((type) => plurals[type]).join(" or ");
      file.message(`${label} applies only to ${typeList}, but there's no 'type', so values of other types are valid`, { place: keywordNode.position });
    }
  }
});

export default keywordWithoutType;
