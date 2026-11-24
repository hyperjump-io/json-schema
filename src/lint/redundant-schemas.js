import { visit } from "unist-util-visit";
import { implies } from "../kernel/implies.js";
import { subexpressions } from "../kernel/kernel.js";
import { marksAreRead, schemaGroup } from "./schema-group.js";

/**
 * @import { Node } from "unist"
 * @import { Expression } from "../kernel/kernel.d.ts"
 * @import { JsonSchemaKeywordNode, JsonSchemaNode } from "../schema/schema-ast.d.ts"
 * @import { LintDocument } from "./document.d.ts"
 */

/**
 * A schema in a keyword whose group is `all` or `any` of the schemas it
 * applies (`allOf`, `anyOf`) that the keyword says the same without,
 * because of another of its schemas (`implies`), with the keyword, where
 * the schema is, and the index of the other one. In `any`, it's a schema
 * that allows nothing another one doesn't. In `all`, it's a schema that
 * allows everything another one does. Of two that allow the same, it's
 * the later one, unless only the earlier one could be left out.
 *
 * A schema that might do more than pass or fail isn't one: it annotates,
 * or it marks properties or items where something might read the marks, or
 * what it does isn't known. `other` is undefined if the keyword's value
 * isn't an array of the schemas.
 *
 * @typedef {{ op: "all" | "any"; keywordNode: JsonSchemaKeywordNode; node: Node; other: number | undefined }} Redundant
 *
 * @type (document: LintDocument) => Redundant[]
 */
export const redundantSchemas = (document) => {
  const lowered = document.schemas;
  const schemas = schemaExpressions(document);
  const expressionImplies = implies(schemas);

  /** @type Redundant[] */
  const redundant = [];
  for (const [schemaNode, keywords] of lowered) {
    /** @type boolean | undefined */
    let marksMightBeRead;

    for (const { group, keywordNode } of keywords) {
      const { expression } = group;
      if ((expression.op !== "all" && expression.op !== "any") || !expression.of.every(({ op }) => op === "apply")) {
        continue;
      }

      // Whether a schema of the keyword is why another has no effect
      /** @type (other: Expression, of: Expression) => boolean */
      const makesRedundant = expression.op === "all"
        ? (other, of) => expressionImplies(other, of)
        : (other, of) => expressionImplies(of, other);

      // Each schema is where it is in the keyword's value, if that's an array of them
      const valueNode = keywordNode.children[1];
      const itemNodes = valueNode.jsonType === "array" && valueNode.children.length === expression.of.length ? valueNode.children : undefined;
      // Whether a schema only passes or fails, as far as anything can see
      /** @type (boolean | undefined)[] */
      const onlyResults = [];
      /** @type (index: number) => boolean */
      const hasOnlyResult = (index) => {
        if (onlyResults[index] === undefined) {
          const effects = effectsOf(expression.of[index], schemas);
          if (effects.marks && marksMightBeRead === undefined) {
            const group = schemaGroup(document, schemaNode);
            marksMightBeRead = group.open || marksAreRead(document, group);
          }
          onlyResults[index] = !effects.unknown && !effects.annotates && !(effects.marks && marksMightBeRead);
        }
        return onlyResults[index];
      };

      for (const [index, of] of expression.of.entries()) {
        // Of two that make each other redundant, the later one is, unless
        // only the earlier one has no other effect
        const other = expression.of.findIndex((other, otherIndex) => {
          return otherIndex !== index && makesRedundant(other, of)
            && !(otherIndex > index && makesRedundant(of, other) && hasOnlyResult(otherIndex));
        });
        if (other !== -1 && hasOnlyResult(index)) {
          redundant.push({
            op: expression.op,
            keywordNode,
            node: itemNodes?.[index] ?? keywordNode,
            other: itemNodes === undefined ? undefined : other
          });
        }
      }
    }
  }
  return redundant;
};

/**
 * A schema in a keyword whose group is `one` of the schemas it applies
 * (`oneOf`) that allows nothing another of them doesn't (`implies`), so no
 * value passes the keyword because of it: whatever it allows, the other
 * one allows too. It's with the keyword, where the schema is, and the
 * index of the other one, which is undefined if the keyword's value isn't
 * an array of the schemas. Of two that allow the same, both are. A schema
 * that allows nothing isn't one, because it has no values to fail.
 *
 * @typedef {{ keywordNode: JsonSchemaKeywordNode; node: Node; other: number | undefined }} Covered
 *
 * @type (document: LintDocument) => Covered[]
 */
export const coveredSchemas = (document) => {
  const expressionImplies = implies(schemaExpressions(document));

  /** @type Covered[] */
  const covered = [];
  for (const keywords of document.schemas.values()) {
    for (const { group, keywordNode } of keywords) {
      const { expression } = group;
      if (expression.op !== "one" || !expression.of.every(({ op }) => op === "apply")) {
        continue;
      }

      const valueNode = keywordNode.children[1];
      const itemNodes = valueNode.jsonType === "array" && valueNode.children.length === expression.of.length ? valueNode.children : undefined;
      for (const [index, of] of expression.of.entries()) {
        if (expressionImplies(of, { op: "fail" })) {
          continue;
        }

        const other = expression.of.findIndex((other, otherIndex) => otherIndex !== index && expressionImplies(of, other));
        if (other !== -1) {
          covered.push({ keywordNode, node: itemNodes?.[index] ?? keywordNode, other: itemNodes === undefined ? undefined : other });
        }
      }
    }
  }
  return covered;
};

/**
 * What each schema in a document is, for `implies`: its keyword groups'
 * expressions, none for `true`, and `fail` for `false`
 *
 * @type (document: LintDocument) => Map<string, Expression[]>
 */
const schemaExpressions = ({ tree, schemas: lowered }) => {
  /** @type Map<string, Expression[]> */
  const schemas = new Map();
  visit(tree, "json-schema", (node) => {
    const schemaNode = /** @type JsonSchemaNode */ (node);
    if (schemaNode.jsonType === "boolean") {
      schemas.set(schemaNode.location, schemaNode.value ? [] : [{ op: "fail" }]);
    } else {
      const keywords = lowered.get(schemaNode);
      if (keywords !== undefined) {
        schemas.set(schemaNode.location, keywords.map(({ group }) => group.expression));
      }
    }
  });
  return schemas;
};

/**
 * What an expression might do besides pass or fail, following the schemas
 * it applies: annotate, or mark properties or items of the instance it's
 * evaluated on. What a schema applied to a property or an item marks is
 * about that property or item, so it isn't counted. It's `unknown` if it
 * applies a schema that isn't known, or has an operation that could do
 * anything.
 *
 * @type (expression: Expression, schemas: ReadonlyMap<string, Expression[]>) => { annotates: boolean; marks: boolean; unknown: boolean }
 */
const effectsOf = (expression, schemas) => {
  const effects = { annotates: false, marks: false, unknown: false };

  /** @type Set<string> */
  const followed = new Set();

  /** @type (expression: Expression, inPlace: boolean) => void */
  const find = (expression, inPlace) => {
    switch (expression.op) {
      case "annotate":
      case "format":
        effects.annotates = true;
        break;
      case "opaque":
      case "dynamicApply":
      case "inline":
        effects.unknown = true;
        break;
      case "apply": {
        const groups = schemas.get(expression.schema);
        const key = `${inPlace}\0${expression.schema}`;
        if (groups === undefined) {
          effects.unknown = true;
        } else if (!followed.has(key)) {
          followed.add(key);
          for (const group of groups) {
            find(group, inPlace);
          }
        }
        break;
      }
      case "property":
      case "eachProperty":
      case "item":
      case "eachItem":
      case "contains":
      case "itemSequence":
      case "eachPropertyName":
        effects.marks ||= inPlace && expression.op !== "eachPropertyName";
        for (const subexpression of subexpressions(expression)) {
          find(subexpression, false);
        }
        break;
      default:
        for (const subexpression of subexpressions(expression)) {
          find(subexpression, inPlace);
        }
    }
  };
  find(expression, true);

  return effects;
};
