import { dependsOn, operationsOf } from "../analysis.js";
import { lintRule } from "../lint-rule.js";
import { lowerForLint } from "../lower.js";
import { requiredByOthers } from "../required-properties.js";
import { nodeFor } from "../utilities.js";

/**
 * @import { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts"
 */

/**
 * A dependency is a `cases` whose condition is that the object has a
 * property, and what it requires is `hasProperty` in its branch
 * (`dependentRequired`, `dependencies` with an array). Required properties
 * are what the schema's other keywords require (`propertyAlternatives`), so
 * no keyword is named.
 *
 * @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void>
 */
const requiredDependentProperty = lintRule({ origin: "json-schema-lint:required-dependent-property", url: "https://hyperjump.io/json-schema/linting/rules/required-dependent-property/" }, async (tree, file) => {
  const session = file.data.jsonSchemaSession;
  if (session === undefined) {
    return;
  }

  const lowered = await lowerForLint(session, tree);
  const schemas = new Map([...lowered].map(([schemaNode, keywords]) => [schemaNode.location, keywords]));
  for (const [schemaNode, keywords] of lowered) {
    for (const keyword of keywords) {
      const dependencies = operationsOf(keyword.group.expression).flatMap((operation) => operation.op === "cases" ? operation.cases : []);
      if (dependencies.length === 0) {
        continue;
      }

      const required = requiredByOthers(schemaNode, keywords, schemas, keyword);
      if (required === undefined) {
        continue;
      }

      const { keywordNode } = keyword;
      for (const [condition, then] of dependencies) {
        // A dependency on a required property is reported by
        // dependency-on-required-property
        const dependency = dependsOn(condition);
        if (dependency === undefined || required.has(dependency) || then === null) {
          continue;
        }

        const entryNode = nodeFor(keywordNode, dependency);
        for (const operation of operationsOf(then)) {
          if (operation.op === "hasProperty" && required.has(operation.name)) {
            const itemNode = entryNode?.type === "json-property" ? nodeFor(/** @type any */ (entryNode), operation.name) : undefined;
            const place = (itemNode ?? entryNode ?? keywordNode).position;
            file.message(`'${operation.name}' is already required, so requiring it here has no effect`, { place });
          }
        }
      }
    }
  }
});

export default requiredDependentProperty;
