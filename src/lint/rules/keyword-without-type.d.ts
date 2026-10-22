import type { Plugin } from "unified-lint-rule";
import type { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts";

/**
 * A keyword that applies only to one type of value, like `properties` to
 * objects or `minimum` to numbers, where nothing says what type the value
 * is. Values of other types are valid, because the keyword ignores them, so
 * `{ "properties": { … } }` accepts `"hello"` and `42`. That's rarely what's
 * meant.
 *
 * `type`, `const`, or `enum` in any schema that can apply to the same value
 * says what type it is, so `required` in an `anyOf` is fine if `type` is
 * next to the `anyOf`, and a schema in `$defs` is fine if what references it
 * has a `type`. It's reported once for each group of schemas, on the first
 * keyword for one type. A group that nothing in the document applies, like
 * a schema in `$defs` that's only used from other documents, isn't
 * reported, and neither is one with a reference that can't be followed, or
 * a keyword in a `not`, where other types are already rejected.
 *
 * A `type` that doesn't allow the keyword's type is reported by
 * `keyword-for-disallowed-type`. It has no options.
 */
declare const keywordWithoutType: Plugin<JsonSchemaDocumentNode, void>;
export default keywordWithoutType;
