import type { Plugin } from "unified-lint-rule";
import type { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts";

/**
 * `wrapped: true` in OpenAPI's `xml` in a schema whose `type` doesn't allow
 * arrays, or that has no `type`. OpenAPI says it "MAY be used only for an
 * array definition", and 3.2 that it "takes effect only when defined
 * alongside `type` being `"array"`", so elsewhere it has no effect. Only
 * the same schema's `type` counts. `wrapped: false` is the default, so it
 * isn't reported. It has no options.
 */
declare const wrappedWithoutArray: Plugin<JsonSchemaDocumentNode, void>;
export default wrappedWithoutArray;
