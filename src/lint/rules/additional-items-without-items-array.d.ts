import type { Plugin } from "unified-lint-rule";
import type { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts";

/**
 * `additionalItems` without a sibling `items` that's an array of schemas.
 * It only applies to the items after the ones that array applies to, so
 * without one, it's ignored. A schema in `items` already applies to every
 * item.
 *
 * It's for draft-04 through 2019-09, which have `additionalItems`. It has
 * no options.
 */
declare const additionalItemsWithoutItemsArray: Plugin<JsonSchemaDocumentNode, void>;
export default additionalItemsWithoutItemsArray;
