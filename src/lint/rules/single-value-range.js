import { typeIsOf } from "../analysis.js";
import { boundsOf, second, tightestMax, tightestMin } from "../bounds.js";
import { lintRule } from "../lint-rule.js";
import { lowerForLint } from "../lower.js";

/**
 * @import { JsonSchemaDocumentNode, JsonSchemaKeywordNode } from "../../schema/schema-ast.d.ts"
 * @import { Dialect } from "../../dialect.d.ts"
 */

const keyword = "https://json-schema.org/keyword";
const constUri = `${keyword}/const`;
const enumUris = [`${keyword}/enum`, `${keyword}/draft-04/enum`];

/**
 * Limits are what `range` says (`boundsOf`), and `type` is a keyword that
 * lowers to `typeIs`, so no keyword is named, except the one it suggests
 * instead, in the dialect's own name.
 *
 * @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void>
 */
const singleValueRange = lintRule({ origin: "json-schema-lint:single-value-range", url: "https://hyperjump.io/json-schema/linting/rules/single-value-range/" }, async (tree, file) => {
  const session = file.data.jsonSchemaSession;
  if (session === undefined) {
    return;
  }

  /** @type [string, string, JsonSchemaKeywordNode, number, string][] */
  const found = [];
  for (const [schemaNode, keywords] of await lowerForLint(session, tree)) {
    // Values of other types are valid, which `const` wouldn't allow
    const type = typeIsOf(keywords);
    if (schemaNode.type !== "json-schema" || type === undefined || [...type.types].some((name) => name !== "number" && name !== "integer")) {
      continue;
    }

    // With an exclusive limit, nothing is valid, which contradictory-limits reports
    const { number } = boundsOf(keywords);
    const min = tightestMin(number.min);
    const max = tightestMax(number.max);
    if (min === undefined || max === undefined || min.exclusive || max.exclusive || min.value !== max.value || min.keywordNode === max.keywordNode) {
      continue;
    }

    found.push([min.label, max.label, second(min.keywordNode, max.keywordNode), min.value, schemaNode.dialectUri]);
  }

  /** @type Map<string, Promise<Dialect>> */
  const dialects = new Map();
  for (const [minimumLabel, maximumLabel, place, value, dialectUri] of found) {
    let dialect = dialects.get(dialectUri);
    if (dialect === undefined) {
      dialect = session.getDialect(dialectUri);
      dialects.set(dialectUri, dialect);
    }

    // Draft-04 doesn't have `const`
    const constName = nameOf(await dialect, [constUri]);
    const enumName = nameOf(await dialect, enumUris);
    const replacement = constName !== undefined ? `'${constName}': ${value}` : enumName !== undefined ? `'${enumName}': [${value}]` : undefined;
    if (replacement === undefined) {
      continue;
    }

    file.message(`${minimumLabel} and ${maximumLabel} are both ${value}, so it's the only valid value. Use ${replacement} instead.`, { place: place.position });
  }
});

export default singleValueRange;

/** @type (dialect: Dialect, uris: string[]) => string | undefined */
const nameOf = ({ keywords }, uris) => Object.keys(keywords).find((name) => uris.includes(keywords[name]));
