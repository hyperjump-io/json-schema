import type { Plugin } from "unified-lint-rule";
import type { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts";

/**
 * A `$schema` for an official dialect that's written with or without an
 * empty fragment, unlike the URI the dialect's meta-schema identifies itself
 * with. That's `http://json-schema.org/draft-07/schema#` with the fragment
 * for draft-04 through draft-07, and
 * `https://json-schema.org/draft/2020-12/schema` without it for 2019-09 and
 * 2020-12. An empty fragment identifies the same resource, so this
 * implementation accepts either, but implementations that compare dialect
 * URIs as strings only recognize the one the meta-schema uses.
 *
 * It only knows draft-04 through 2020-12, not dialects a meta-schema
 * defines. v1 isn't covered, because its spec doesn't allow a fragment at
 * all. It has no options.
 */
declare const nonCanonicalDialectUri: Plugin<JsonSchemaDocumentNode, void>;
export default nonCanonicalDialectUri;
