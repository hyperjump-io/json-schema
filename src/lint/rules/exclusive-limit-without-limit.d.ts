import type { Plugin } from "unified-lint-rule";
import type { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts";

/**
 * `exclusiveMaximum` without `maximum`, or `exclusiveMinimum` without
 * `minimum`, in OpenAPI 3.0. They only make the limit next to them
 * exclusive, so without it they have no effect, and the limit may be
 * missing by mistake. 3.0's JSON Schema draft (draft-wright-00) allows it,
 * so it's a warning. Draft-04 requires the limit, so there it's a problem
 * with the schema, which this rule doesn't report.
 * It has no options.
 */
declare const exclusiveLimitWithoutLimit: Plugin<JsonSchemaDocumentNode, void>;
export default exclusiveLimitWithoutLimit;
