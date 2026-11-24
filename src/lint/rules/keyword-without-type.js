import { visit } from "unist-util-visit";
import { subexpressions } from "../../kernel/kernel.js";
import { canPass, keywordAppliesTo, operationsOf } from "../analysis.js";
import { appliedSchemas } from "../applied.js";
import { formatTypes } from "../format-types.js";
import { documentForLint } from "../document.js";
import { lintRule } from "../lint-rule.js";
import { isAppliedToAValue, isNegated, schemaGroup } from "../schema-group.js";

/**
 * @import { JsonType } from "@hyperjump/browser"
 * @import { Expression } from "../../kernel/kernel.d.ts"
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
  const document = await documentForLint(tree, file);
  if (document === undefined) {
    return;
  }

  const lowered = document.schemas;

  /** @type JsonSchemaNode[] */
  const schemas = [];
  visit(tree, "json-schema", (node) => {
    const schemaNode = /** @type JsonSchemaNode */ (node);
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

  const everyType = Object.keys(plurals).length;
  const { keywordsOf, find, appliedBy } = appliedSchemas(document);

  // The types a schema can pass, from its keywords and the schemas they
  // apply in place, in whichever document they're in. A schema that's a
  // reference (draft-04 through draft-07) is what it refers to. One that
  // applies itself, or isn't known, can pass any type.
  /** @type Map<JsonSchemaNode, Set<JsonType> | undefined> */
  const passable = new Map();
  /** @type (schemaNode: JsonSchemaNode | undefined) => Set<JsonType> | undefined */
  const typesOf = (schemaNode) => {
    if (schemaNode === undefined || passable.has(schemaNode)) {
      return schemaNode && passable.get(schemaNode);
    }

    passable.set(schemaNode, undefined);
    /** @type Set<JsonType> | undefined */
    let types;
    if (schemaNode.type === "reference") {
      types = typesOf(find(schemaNode.href));
    } else if (schemaNode.jsonType === "boolean") {
      types = schemaNode.value ? undefined : new Set();
    } else {
      const expressions = (keywordsOf(schemaNode) ?? []).map((keyword) => {
        const applied = appliedBy(keyword);
        return canPass(keyword.group.expression, (handle) => typesOf(applied(handle)));
      });
      types = canPassAll(expressions);
    }
    passable.set(schemaNode, types);
    return types;
  };

  // Whether a schema only applies another where a condition that says the
  // type passes, like `then` with an `if` that has a `type`, or a dependent
  // schema, which only applies to objects
  /** @type (from: JsonSchemaNode, to: JsonSchemaNode) => boolean */
  const appliesWhereTyped = (from, to) => {
    return (keywordsOf(from) ?? []).some((keyword) => {
      const applied = appliedBy(keyword);

      /** @type (expression: Expression) => boolean */
      const isBranchWhereTyped = (expression) => {
        if (expression.op !== "cases") {
          return subexpressions(expression).some(isBranchWhereTyped);
        }
        return expression.cases.some(([condition, then]) => {
          return then !== null && operationsOf(then).some((operation) => operation.op === "apply" && applied(operation.schema) === to)
            && canPass(condition, (handle) => typesOf(applied(handle))).size < everyType;
        });
      };
      return isBranchWhereTyped(keyword.group.expression);
    });
  };

  // Whether something says what type a schema's value is: it can't pass
  // every type, or every schema that applies it in place has something that
  // says or only applies it where a condition says. A sibling in an `anyOf` doesn't say, because it doesn't have to
  // pass. A schema that's applied to a value of its own has nothing above
  // it, and one nothing here applies is used from other documents, which
  // may say.
  /** @type Map<JsonSchemaNode, boolean> */
  const typed = new Map();
  /** @type (schemaNode: JsonSchemaNode, group: SchemaGroup) => boolean */
  const isTyped = (schemaNode, group) => {
    let result = typed.get(schemaNode);
    if (result === undefined) {
      typed.set(schemaNode, true);
      const types = typesOf(schemaNode);
      if (types !== undefined && types.size < everyType) {
        result = true;
      } else if (isAppliedToAValue(document, schemaNode)) {
        result = false;
      } else {
        result = group.links.every(({ from, to }) => to !== schemaNode || appliesWhereTyped(from, to) || isTyped(from, group));
      }
      typed.set(schemaNode, result);
    }
    return result;
  };

  // The first keyword for some types in each group that nothing says the
  // type for, which is reported once
  /** @type Map<SchemaGroup, TypedKeyword> */
  const firsts = new Map();
  for (const schemaNode of schemas) {
    if (schemaNode.jsonType !== "object") {
      continue;
    }

    /** @type TypedKeyword | undefined */
    let typedKeyword;
    const keywords = lowered.get(schemaNode) ?? [];
    for (const keywordNode of /** @type JsonSchemaKeywordNode[] */ (schemaNode.children)) {
      // A format that could apply to any type isn't reported
      const formatNode = keywordNode.children[1];
      const types = formatTypes(document, schemaNode, keywordNode);
      if (types !== undefined && formatNode.jsonType === "string") {
        typedKeyword = { keywordNode, label: `The '${formatNode.value}' format`, types };
        break;
      }

      // Neither is a keyword with no effect, which applies to nothing
      const applies = keywordAppliesTo(document, keywords, keywordNode);
      if (applies.length > 0 && applies.length < everyType) {
        typedKeyword = { keywordNode, label: `'${keywordNode.children[0].value}'`, types: applies };
        break;
      }
    }
    if (typedKeyword === undefined) {
      continue;
    }

    const group = schemaGroup(document, schemaNode);

    // A group that nothing here applies is used from other documents, which
    // may say what type it is. A keyword in a `not` rejects the type it's for,
    // so other types are already valid. A schema for property names only
    // sees strings.
    if (group.unknown || !group.applied || isNegated(group, schemaNode) || group.schemas.some((member) => propertyNamesSchemas.has(member.location))) {
      continue;
    }

    const first = firsts.get(group);
    const offset = /** @type number */ (typedKeyword.keywordNode.position?.start.offset);
    if ((first === undefined || offset < /** @type number */ (first.keywordNode.position?.start.offset)) && !isTyped(schemaNode, group)) {
      firsts.set(group, typedKeyword);
    }
  }

  for (const { keywordNode, label, types } of firsts.values()) {
    const typeList = types.map((type) => plurals[type]).join(" or ");
    file.message(`${label} applies only to ${typeList}, but there's no 'type', so values of other types are valid`, { place: keywordNode.position });
  }
});

/**
 * The types every one of some expressions can pass, or undefined if that's
 * every type
 *
 * @type (types: Set<JsonType>[]) => Set<JsonType> | undefined
 */
const canPassAll = (types) => {
  return types.length === 0 ? undefined : types.reduce((result, each) => new Set([...result].filter((type) => each.has(type))));
};

export default keywordWithoutType;
