import type { Plugin } from "unified-lint-rule";
import type { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts";

/**
 * `contentSchema` without a sibling `contentMediaType`. `contentSchema`
 * describes a string's content once it's been interpreted as the media
 * type, so without one, it isn't an annotation. The specs say it should be
 * ignored, so it's lint.
 *
 * It finds the keywords by URI, so it works in every dialect with
 * `contentSchema` (2019-09 and later). It has no options.
 */
declare const contentSchemaWithoutMediaType: Plugin<JsonSchemaDocumentNode, void>;
export default contentSchemaWithoutMediaType;
