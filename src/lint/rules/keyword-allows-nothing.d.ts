import type { Plugin } from "unified-lint-rule";
import type { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts";

/**
 * A keyword that nothing is valid against, so the schema it's in fails
 * every instance. That's what `false` is for, so it's more likely
 * something that's missing or a mistake: an empty `enum` or `type`, or
 * `allOf` with a schema that allows nothing, like `false` or
 * `{ "type": "string", "const": 1 }`, or `anyOf` whose every schema does.
 * It's found from what the keyword lowers to, so custom keywords are
 * covered too.
 *
 * Only the schemas in the keyword's own value are followed, so a `$ref` to
 * a schema that allows nothing, which is often on purpose, isn't reported.
 * Neither is a keyword that only rejects some properties or items, like
 * `items: false` or `additionalProperties: false`, or `not: {}`, a common
 * way to say "nothing" on purpose. The specs say `enum` should have at
 * least one value. Draft-04 says it must, and v1 doesn't allow an empty
 * `type`, so there they're problems with the schema, which this rule
 * doesn't report. It has no options.
 */
declare const keywordAllowsNothing: Plugin<JsonSchemaDocumentNode, void>;
export default keywordAllowsNothing;
