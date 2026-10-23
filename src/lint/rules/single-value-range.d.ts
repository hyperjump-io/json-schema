import type { Plugin } from "unified-lint-rule";
import type { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts";

/**
 * `minimum` and `maximum` with the same value, where `type` only allows
 * numbers, so that value is the only one that's valid. `const` says it more
 * directly, or a single-value `enum` in draft-04, which doesn't have
 * `const`. The schema's other keywords stay as they are, so replacing the
 * limits doesn't change what's valid.
 *
 * Without `type`, or where `type` allows other types, values of those types
 * are valid too, which `const` wouldn't allow, so it isn't reported. With
 * an exclusive limit, nothing is valid, which `contradictory-limits`
 * reports. It has no options.
 */
declare const singleValueRange: Plugin<JsonSchemaDocumentNode, void>;
export default singleValueRange;
