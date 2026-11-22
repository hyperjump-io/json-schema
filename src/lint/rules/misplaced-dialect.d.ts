import type { Plugin } from "unified-lint-rule";
import type { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts";

/**
 * `$schema` where the dialect of the schema it's in doesn't allow it.
 * 2019-09 and later allow it at the root of a schema resource: the
 * document's root, or a schema with an `$id`. Draft-04 through draft-07
 * only allow it at the document's root. The specs say it must not appear
 * anywhere else. This implementation ignores it where a schema resource
 * doesn't start, and reads the schema in its parent's dialect. It uses one
 * at the root of an embedded resource, and one next to a draft-04–07
 * `$ref`, where it decides what `$ref` means. Other implementations might
 * not do either, so it's an error in the recommended preset.
 * It has no options.
 */
declare const misplacedDialect: Plugin<JsonSchemaDocumentNode, void>;
export default misplacedDialect;
