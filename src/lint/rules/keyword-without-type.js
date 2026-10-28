import { canPass, keywordAppliesTo, operationsOf } from "../analysis.js";
import { appliedSchemas } from "../applied.js";
import { formatTypes } from "../format-types.js";
import { lintRule } from "../lint-rule.js";
import { lowerForLint } from "../lower.js";
import { isNegated, schemaGroup } from "../schema-group.js";
import { visitSchemas } from "../utilities.js";

/**
 * @import { JsonSchemaDocumentNode, JsonSchemaKeywordNode, JsonSchemaNode } from "../../schema/schema-ast.d.ts"
 * @import { SchemaGroup } from "../schema-group.d.ts"
 */

/**
 * A keyword that applies only to some types, and what to call it
 *
 * @typedef {{ keywordNode: JsonSchemaKeywordNode; label: string; types: string[] }} TypedKeyword
 */

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
const keywordWithoutType = lintRule({ origin: "json-schema-lint:keyword-without-type", url: "https://hyperjump.io/json-schema/linting/rules/keyword-without-type/" }, async (tree, file) => {
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
  /** @type Set<string> */
  const propertyNamesSchemas = new Set();
  for (const keywords of lowered.values()) {
    for (const { group } of keywords) {
      for (const operation of operationsOf(group.expression)) {
        if (operation.op === "eachPropertyName" && operation.of.op === "apply") {
          propertyNamesSchemas.add(operation.of.schema);
        }
      }
    }
  }

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
    if (group.unknown || !group.applied || isNegated(group, schemaNode) || group.schemas.some((member) => propertyNamesSchemas.has(member.location))) {
      continue;
    }

    const first = firsts.get(group);
    const offset = /** @type number */ (typed.keywordNode.position?.start.offset);
    if (first === undefined || offset < /** @type number */ (first.keywordNode.position?.start.offset)) {
      firsts.set(group, typed);
    }
  }

  // A schema in the group can be in another document
  const applied = await appliedSchemas(session, tree);

  for (const [group, { keywordNode, label, types }] of firsts) {
    // A keyword says what type a value is if it can't pass every type, like
    // `type`, `const`, and `enum`. A schema that's a reference (draft-04
    // through draft-07) ignores what's next to it.
    let typed = false;
    for (const member of group.schemas) {
      const keywords = member.type === "json-schema" ? await applied.lowered(member) ?? [] : [];
      typed ||= keywords.some(({ group }) => canPass(group.expression).size < Object.keys(plurals).length);
    }
    if (!typed) {
      const typeList = types.map((type) => plurals[type]).join(" or ");
      file.message(`${label} applies only to ${typeList}, but there's no 'type', so values of other types are valid`, { place: keywordNode.position });
    }
  }
});

export default keywordWithoutType;
