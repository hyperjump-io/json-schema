import type { Plugin } from "unified-lint-rule";
import type { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts";

/**
 * A `discriminator`'s `mapping` value, or 3.2's `defaultMapping`, in an
 * OpenAPI document, that doesn't find a schema. A value that can be a
 * schema name, a key of `components.schemas`, is one, as OpenAPI RECOMMENDS
 * when it could be either, so a URI reference like one needs `./`, which
 * OpenAPI says authors MUST add, and the message says so. Anything else is
 * a URI reference, resolved against the base URI of the schema the
 * `discriminator` is in. One into another document isn't checked, because
 * lint doesn't retrieve anything. A schema in a file of its own isn't
 * checked, because it has no schema names. It has no options.
 */
declare const discriminatorMappingWithoutTarget: Plugin<JsonSchemaDocumentNode, void>;
export default discriminatorMappingWithoutTarget;
