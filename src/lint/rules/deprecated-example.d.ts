import type { Plugin } from "unified-lint-rule";
import type { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts";

/**
 * OpenAPI's `example`, which 3.1 and later deprecate in favor of JSON
 * Schema's `examples`. The suggestion is the dialect's name for
 * `examples`. A dialect without `examples`, like OpenAPI 3.0, where
 * `example` isn't deprecated, isn't reported. It has no options.
 */
declare const deprecatedExample: Plugin<JsonSchemaDocumentNode, void>;
export default deprecatedExample;
