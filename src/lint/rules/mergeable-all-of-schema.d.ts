import type { Plugin } from "unified-lint-rule";
import type { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts";

/**
 * A schema in `allOf` whose keywords can be moved into the schema the
 * `allOf` is in without changing what's valid, so wrapping it in `allOf`
 * isn't needed. Turn it off if you compose schemas in `allOf` because
 * it's clearer.
 *
 * A schema can't be moved if a keyword in it is already there, from the
 * schema or from a schema before it that can be moved, except that
 * `properties` and other maps are combined if they don't have a name in
 * common, and `required` is always combined. It can't be moved next to a
 * keyword it reads, or one that reads it, like `additionalProperties` and
 * `properties`, or `if` and `then`, because that changes what it means.
 * That comes from each keyword's `siblings`, so it works for custom
 * keywords too. Neither can a schema with an identifier, like `$id` or
 * `$anchor` (a keyword with a `resolve` hook), or definitions, whose URIs
 * would change, or one with a keyword that reads what its siblings
 * evaluated, like `unevaluatedProperties`. From 2019-09, `$ref` is a
 * keyword like any other, so `allOf: [{ "$ref": … }]` is reported. In
 * draft-04 through draft-07, a schema that's a `$ref` replaces the schema
 * it's in, so it's only reported if it's the only schema in `allOf` and
 * there's nothing but `allOf` in the schema it's in. Booleans aren't
 * reported.
 *
 * It only looks at the schema with `allOf` and the schemas in it, not at
 * what they reference, so it doesn't matter what a `$ref` refers to. A reference into a schema in `allOf`, like
 * `#/allOf/0/properties/a`, would need to change too, which this rule
 * doesn't look for. It has no options.
 */
declare const mergeableAllOfSchema: Plugin<JsonSchemaDocumentNode, void>;
export default mergeableAllOfSchema;
