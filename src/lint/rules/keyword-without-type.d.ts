import type { Plugin } from "unified-lint-rule";
import type { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts";

/**
 * A keyword that applies only to one type of value, like `properties` to
 * objects or `minimum` to numbers, or a format that does, like `date` to
 * strings, where nothing says what type the value is. Values of other types are valid, because the keyword ignores them, so
 * `{ "properties": { … } }` accepts `"hello"` and `42`. That's rarely what's
 * meant.
 *
 * `type`, `const`, or `enum` says what type it is, where it has to pass
 * whenever the keyword applies: next to the keyword, in a schema the
 * keyword's schema applies, like one in its `allOf` or what its `$ref`
 * refers to, or in a schema that applies the keyword's. So `required` in an
 * `anyOf` is fine if `type` is next to the `anyOf`, and a schema in `$defs`
 * is fine if everything that references it has a `type`. A `type` in
 * another schema of the same `anyOf` or `oneOf` doesn't say, because it
 * doesn't have to pass, so the `pattern` in
 * `anyOf: [{ "enum": ["a"] }, { "pattern": "^a" }]` is reported. `anyOf`
 * says the type itself if every one of its schemas does. A schema that's
 * only applied where a condition that says the type passes, like `then`
 * when `if` has a `type`, or a dependent schema, is fine too.
 *
 * It's reported once for each group of schemas that apply to the same
 * value, on the first keyword for one type that nothing says the type for.
 * A group that nothing in the document applies, like a schema in `$defs`
 * that's only used from other documents, isn't reported, and neither is
 * one with a reference that can't be followed, a keyword in a `not`, where
 * other types are already rejected, or a group with a `propertyNames`
 * schema, which only applies to strings.
 *
 * A format's types come from its definition (`types`), so a custom format
 * that doesn't say, or one the dialect doesn't support, isn't reported.
 * A `type` that doesn't allow the keyword's type is reported by
 * `keyword-for-disallowed-type`. It has no options.
 */
declare const keywordWithoutType: Plugin<JsonSchemaDocumentNode, void>;
export default keywordWithoutType;
