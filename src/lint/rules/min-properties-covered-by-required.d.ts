import type { Plugin } from "unified-lint-rule";
import type { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts";

/**
 * `minProperties` that's no more than the number of properties the schema's
 * other keywords already require. An object that passes them already has
 * that many, so `minProperties` never fails on its own. It's likely out of
 * date, or meant to count properties beyond the required ones, which it
 * doesn't. More required properties than `maxProperties` allows is reported
 * by `contradictory-limits`.
 *
 * Each required property is counted once. What's required includes
 * `required` in an `allOf` or in a schema a `$ref` applies, the fewest an
 * `anyOf` or `oneOf` branch requires, and v1's `requireAllExcept`. A
 * dependency, like `dependentRequired`, only requires its properties of
 * some objects, so they aren't counted. It has no options.
 */
declare const minPropertiesCoveredByRequired: Plugin<JsonSchemaDocumentNode, void>;
export default minPropertiesCoveredByRequired;
