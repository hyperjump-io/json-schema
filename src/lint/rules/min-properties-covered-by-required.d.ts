import type { Plugin } from "unified-lint-rule";
import type { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts";

/**
 * `minProperties` that's no more than the number of properties the sibling
 * `required` requires. An object with the required properties already has
 * that many, so `minProperties` never fails on its own. It's likely out of
 * date, or meant to count properties beyond the required ones, which it
 * doesn't. `required` with more properties than `maxProperties` allows is
 * reported by `contradictory-limits`.
 *
 * Each property in `required` is counted once. It only looks at one schema
 * at a time, not at `required` in another schema that applies to the same
 * value, such as one in an `allOf`. It has no options.
 */
declare const minPropertiesCoveredByRequired: Plugin<JsonSchemaDocumentNode, void>;
export default minPropertiesCoveredByRequired;
