import type { Plugin } from "unified-lint-rule";
import type { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts";

/**
 * A reference that doesn't find a schema: a file that doesn't exist, a
 * JSON Pointer or anchor that isn't in the document, or something that
 * isn't a schema. It checks every static reference (`$ref`), in the same
 * document or another one, in every dialect.
 *
 * Only what's certainly missing is reported. A reference to something that
 * can't be retrieved, such as a URL `allowRetrieval` refuses, or to a schema
 * that has problems of its own, isn't. See `findSchema`.
 *
 * It needs the schema to be resolved first (`jsonSchemaResolve`), and
 * otherwise does nothing. It has no options.
 */
declare const referenceWithoutTarget: Plugin<JsonSchemaDocumentNode, void>;
export default referenceWithoutTarget;
