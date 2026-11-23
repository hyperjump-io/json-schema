import type { Plugin } from "unified-lint-rule";
import type { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts";

/**
 * `exclusiveMaximum` without `maximum`, or `exclusiveMinimum` without
 * `minimum`, in draft-04 and OpenAPI 3.0, where they're booleans that make
 * the limit next to them exclusive. Without that limit they have no
 * effect, and the limit may be missing by mistake. Draft-04 says the limit
 * MUST be there, so it's an error in the recommended preset. 3.0's JSON
 * Schema draft (draft-wright-00) doesn't, so it's a warning in
 * `@hyperjump/openapi`'s `openapi-3-0`.
 * It has no options.
 */
declare const exclusiveLimitWithoutLimit: Plugin<JsonSchemaDocumentNode, void>;
export default exclusiveLimitWithoutLimit;
