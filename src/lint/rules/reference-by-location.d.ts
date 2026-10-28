import type { Plugin } from "unified-lint-rule";
import type { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts";

/**
 * A reference that finds a schema by where it is rather than by its
 * identifier: by its file, like `common.schema.json` for a file whose
 * `$id` is `https://example.com/common`, by a URL it was retrieved from
 * that isn't its `$id`, or by a JSON Pointer into an embedded resource,
 * like `#/$defs/embedded` for a schema with its own `$id`. A schema's
 * identifier is the same wherever it is, and its location isn't, so the
 * reference breaks when the schema moves, and bundling can't keep it. The
 * spec says a JSON Pointer SHOULD NOT be used to identify an embedded
 * resource or something in it. A schema found both ways is two documents,
 * so a tool that has it in a registry by its `$id` sees one copy, and the
 * reference finds another.
 *
 * The message gives the identifier, which is the schema resource's `$id`,
 * with a JSON Pointer from there if the reference finds something in it.
 * Only a reference whose target's identifier also finds it is reported.
 * Otherwise the reference couldn't use it. Every static reference (`$ref`)
 * is checked, in every dialect.
 *
 * It needs the schema to be resolved first (`jsonSchemaResolve`), and
 * otherwise does nothing. It has no options.
 */
declare const referenceByLocation: Plugin<JsonSchemaDocumentNode, void>;
export default referenceByLocation;
