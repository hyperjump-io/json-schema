import { keywordDefinitionUri } from "../keywords/unknown.js";
import { subexpressions } from "./kernel.js";
import { formatOf, keywordOf } from "../definition-of.js";

/**
 * @import { Format } from "../format.d.ts"
 * @import { JsonSchemaDefinitions } from "../json-schema.d.ts"
 * @import { Keyword } from "../keyword.d.ts"
 * @import { Expression, Kernel } from "./kernel.d.ts"
 */

/**
 * The definitions a kernel uses, by URI: each group's keyword, which
 * plugins see, the formats that assert, and the keywords of escape hatches,
 * for their `evaluate`. Evaluators read these, not all of the JSON Schema
 * definitions, so a compiled schema is a kernel and its definitions.
 *
 * @typedef {{
 *   keywords: Readonly<Record<string, Keyword>>;
 *   formats: Readonly<Record<string, Format>>;
 * }} Definitions
 */

/**
 * A kernel's definitions. One that's missing throws, so a schema that can't
 * be evaluated isn't compiled or restored.
 *
 * @type (schemaDefinitions: JsonSchemaDefinitions, kernel: Kernel) => Definitions
 */
export const kernelDefinitions = (schemaDefinitions, kernel) => {
  /** @type MutableDefinitions */
  const definitions = { keywords: {}, formats: {} };
  for (const handle in kernel.schemas) {
    const schema = kernel.schemas[handle];
    if (typeof schema !== "boolean") {
      for (const { keywordUri, expression } of schema.keywords) {
        const uri = keywordDefinitionUri(keywordUri);
        definitions.keywords[uri] ??= keywordOf(schemaDefinitions.keywords, uri);
        addDefinitions(definitions, schemaDefinitions, expression, false);
      }
    }
  }
  return definitions;
};

/**
 * The definitions expressions use, without the ones that aren't in the JSON
 * Schema definitions, for lint, which evaluates what it can
 *
 * @type (schemaDefinitions: JsonSchemaDefinitions, expressions: Iterable<Expression>) => Definitions
 */
export const availableDefinitions = (schemaDefinitions, expressions) => {
  /** @type MutableDefinitions */
  const definitions = { keywords: {}, formats: {} };
  for (const expression of expressions) {
    addDefinitions(definitions, schemaDefinitions, expression, true);
  }
  return definitions;
};

/**
 * The `evaluate` of the keyword an escape hatch is for
 *
 * @type (definitions: Definitions, uri: string) => NonNullable<Keyword["evaluate"]>
 */
export const keywordEvaluate = (definitions, uri) => {
  const evaluate = definitions.keywords[uri]?.evaluate;
  if (evaluate === undefined) {
    throw Error(`The '${uri}' keyword lowers to an escape hatch, so it needs 'evaluate'`);
  }

  return evaluate;
};

/**
 * @typedef {{ keywords: Record<string, Keyword>; formats: Record<string, Format> }} MutableDefinitions
 */

/**
 * @type (definitions: MutableDefinitions, schemaDefinitions: JsonSchemaDefinitions, expression: Expression, tolerant: boolean) => void
 */
const addDefinitions = (definitions, schemaDefinitions, expression, tolerant) => {
  if (expression.op === "format" && expression.assert) {
    const uri = /** @type string */ (expression.uri);
    if (!tolerant || uri in schemaDefinitions.formats) {
      definitions.formats[uri] ??= formatOf(schemaDefinitions.formats, uri);
    }
  } else if (expression.op === "predicate" || expression.op === "opaque") {
    if (!tolerant || expression.keyword in schemaDefinitions.keywords) {
      definitions.keywords[expression.keyword] ??= keywordOf(schemaDefinitions.keywords, expression.keyword);
      if (!tolerant) {
        keywordEvaluate(definitions, expression.keyword);
      }
    }
  }
  subexpressions(expression).forEach((subexpression) => {
    addDefinitions(definitions, schemaDefinitions, subexpression, tolerant);
  });
};
