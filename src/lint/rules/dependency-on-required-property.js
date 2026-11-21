import { dependsOn, operationsOf } from "../analysis.js";
import { documentForLint } from "../document.js";
import { lintRule } from "../lint-rule.js";
import { list } from "../list.js";
import { requiredByOthers } from "../required-properties.js";
import { nodeFor } from "../utilities.js";

/**
 * @import { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts"
 * @import { Expression } from "../../kernel/kernel.d.ts"
 * @import { LoweredKeyword } from "../lower.d.ts"
 */

/**
 * A dependency is a `cases` whose condition is that the object has a
 * property (`dependentRequired`, `dependentSchemas`, `dependencies`), and
 * a condition like `if` is one that only requires properties. Required
 * properties are what the schema's other keywords require
 * (`propertyAlternatives`), so no keyword is named.
 *
 * @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void>
 */
const dependencyOnRequiredProperty = lintRule({ origin: "json-schema-lint:dependency-on-required-property", url: "https://hyperjump.io/json-schema/linting/rules/dependency-on-required-property/" }, async (tree, file) => {
  const document = await documentForLint(tree, file);
  if (document === undefined) {
    return;
  }

  const lowered = document.schemas;
  const schemas = new Map([...lowered].map(([schemaNode, keywords]) => [schemaNode.location, keywords]));
  for (const [schemaNode, keywords] of lowered) {
    for (const keyword of keywords) {
      const conditions = operationsOf(keyword.group.expression)
        .flatMap((operation) => operation.op === "cases" ? operation.cases.map(([condition]) => condition) : []);
      if (conditions.length === 0) {
        continue;
      }

      const required = requiredByOthers(schemaNode, keywords, schemas, keyword);
      if (required === undefined) {
        continue;
      }

      const { keywordNode } = keyword;
      for (const condition of conditions) {
        const dependency = dependsOn(condition);
        const names = dependency === undefined ? requiredBy(condition, schemas) : [dependency];
        if (names === undefined || names.length === 0 || !names.every((name) => required.has(name))) {
          continue;
        }

        if (dependency !== undefined) {
          const place = (nodeFor(keywordNode, dependency) ?? keywordNode).position;
          file.message(`'${dependency}' is required, so this dependency always applies`, { place });
        } else {
          const are = names.length === 1 ? "is" : "are";
          const name = keywordNode.children[0].value;
          file.message(`${list(names.map((name) => `'${name}'`))} ${are} required, so the '${name}' schema always passes`, { place: keywordNode.position });
        }
      }
    }
  }
});

export default dependencyOnRequiredProperty;

/**
 * The properties a condition requires, if that's all it asserts, following
 * the schemas it applies. A condition that does anything else, or applies a
 * schema that isn't known, is undefined.
 *
 * @type (condition: Expression, schemas: Map<string, LoweredKeyword[]>) => string[] | undefined
 */
const requiredBy = (condition, schemas) => {
  /** @type Set<string> */
  const names = new Set();
  /** @type Set<string> */
  const following = new Set();

  /** @type (expression: Expression) => boolean */
  const visit = (expression) => {
    switch (expression.op) {
      case "pass":
      case "annotate":
        return true;
      case "hasProperty":
        names.add(expression.name);
        return true;
      case "all":
        return expression.of.every(visit);
      case "apply": {
        const keywords = schemas.get(expression.schema);
        if (keywords === undefined || following.has(expression.schema)) {
          return false;
        }

        following.add(expression.schema);
        const result = keywords.every(({ group }) => visit(group.expression));
        following.delete(expression.schema);
        return result;
      }
      default:
        return false;
    }
  };

  return visit(condition) ? [...names] : undefined;
};
