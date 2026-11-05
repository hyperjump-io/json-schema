import { operationsOf } from "./analysis.js";

/**
 * @import { JsonSchemaKeywordNode, JsonSchemaNode } from "../schema/schema-ast.d.ts"
 * @import { LoweredKeyword } from "./lower.d.ts"
 */

/**
 * A keyword that has to pass for a schema to pass. For a keyword of a
 * schema the schema applies, `applying` is the keyword in the schema that it
 * counts as, and `via` is the location of the schema that keyword applies,
 * which has the keyword in its own group. Both are undefined for the
 * schema's own keywords.
 *
 * @typedef {{ keyword: LoweredKeyword; applying?: JsonSchemaKeywordNode; via?: string }} MustPass
 */

/**
 * A schema's keywords, and the keywords of the schemas it applies in place
 * that have to pass whenever it does, from what they lower to. An `apply`
 * that's a keyword's expression or in its `all` has to pass, like `allOf`'s
 * and `$ref`'s. What's applied in `any`, `one`, `not`, or `cases` doesn't.
 * Applied schemas are followed, if they're in `schemas`, by location, and
 * each one once, so a schema that applies itself stops. What an applied
 * schema's keywords say counts as the keyword in the schema that applied it
 * (see {@link creditedKeyword}).
 *
 * @type (schemaNode: JsonSchemaNode, keywords: LoweredKeyword[], schemas: Map<string, LoweredKeyword[]>) => MustPass[]
 */
export const keywordsThatMustPass = (schemaNode, keywords, schemas) => {
  /** @type MustPass[] */
  const result = [];
  const followed = new Set([schemaNode.location]);

  /** @type (keywords: LoweredKeyword[], applying?: JsonSchemaKeywordNode, via?: string) => void */
  const follow = (keywords, applying, via) => {
    for (const keyword of keywords) {
      result.push({ keyword, applying, via });
      for (const operation of operationsOf(keyword.group.expression)) {
        const applied = operation.op === "apply" ? schemas.get(operation.schema) : undefined;
        if (operation.op !== "apply" || applied === undefined || followed.has(operation.schema)) {
          continue;
        }

        followed.add(operation.schema);
        follow(applied, applying ?? creditedKeyword(keyword, operation.schema), via ?? operation.schema);
      }
    }
  };

  follow(keywords);
  return result;
};

/**
 * The keyword in a schema that a schema one of its keywords applies counts
 * as: the keyword whose value the applied schema is in, which can be a
 * sibling it reads (`then` for `if`), or the keyword itself, for a
 * reference
 *
 * @type (keyword: LoweredKeyword, schema?: string) => JsonSchemaKeywordNode
 */
export const creditedKeyword = ({ group, keywordNode, sourceNodes }, schema) => {
  const index = schema === undefined ? -1 : group.sources.findIndex((source) => isIn(schema, source));
  return index === -1 ? keywordNode : sourceNodes[index];
};

/**
 * Whether a location is at or under another
 *
 * @type (location: string, parent: string) => boolean
 */
const isIn = (location, parent) => location === parent || location.startsWith(`${parent}/`);
