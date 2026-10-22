import type { Plugin } from "unified-lint-rule";
import type { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts";

/**
 * `minContains: 0` next to `contains`, without `maxContains`. Any number of
 * items can match `contains`, including none, so it never fails. The specs
 * say 0 is only useful with `maxContains`. `contains` still marks the items
 * that match as evaluated, for `unevaluatedItems`, which may be the point,
 * but that's rarely what's meant.
 *
 * Without `contains`, `min-max-contains-without-contains` reports it
 * instead. It has no options.
 */
declare const minContainsZeroWithoutMaxContains: Plugin<JsonSchemaDocumentNode, void>;
export default minContainsZeroWithoutMaxContains;
