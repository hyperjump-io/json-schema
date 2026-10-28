import type { Plugin } from "unified-lint-rule";
import type { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts";

/**
 * A relative `$id` (`id` in draft-04) on the root schema of a document, like
 * `/user` or `user.schema.json`. It's resolved against the URI the schema was
 * retrieved from, so the same schema has a different identifier in each
 * place it's served or saved, references to it by that identifier break
 * when it moves, and bundling can't keep it. The spec says the root SHOULD
 * have an absolute one in draft-06 through v1. draft-04 doesn't say, but the
 * same problems apply.
 *
 * A root without `$id`, or with a fragment-only draft-04–07 `$id`, which is
 * an anchor, isn't reported: a schema identified by where it lives is common,
 * and nothing about it is ambiguous. A relative `$id` on an embedded resource
 * is resolved against the resource it's in, so it isn't reported either. An
 * `$id` that isn't a valid URI reference is reported by the resolver. In a
 * file, a relative root `$id` resolves to a `file:` URI, which the resolver
 * reports too, because a schema can't be identified by a file. It has no
 * options.
 */
declare const relativeRootId: Plugin<JsonSchemaDocumentNode, void>;
export default relativeRootId;
