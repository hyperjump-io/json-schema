import type { Plugin } from "unified-lint-rule";
import type { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts";

/**
 * A `$schema` with a fragment that isn't empty, one that isn't normalized,
 * like `HTTP://json-schema.org/…`, or one for draft-04 through 2020-12 that
 * doesn't match the URI its meta-schema uses: with the empty fragment for
 * draft-04 through draft-07 (`http://json-schema.org/draft-07/schema#`),
 * and without it for 2019-09 and 2020-12. This implementation recovers, but
 * implementations that compare dialect URIs as strings won't recognize the
 * dialect. See `design/components/dialects/README.md` for why.
 *
 * v1 is reported by `invalid-dialect-uri` instead. It has no options.
 */
declare const nonCanonicalDialectUri: Plugin<JsonSchemaDocumentNode, void>;
export default nonCanonicalDialectUri;
