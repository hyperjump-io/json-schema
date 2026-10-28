import type { Plugin } from "unified-lint-rule";
import type { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts";

/**
 * A schema whose keywords can be moved into the schema it's in without
 * changing what's valid, so wrapping it isn't needed: a schema in `allOf`,
 * or the one schema in an `anyOf` or `oneOf` with only one, which means the
 * same as `allOf` with it. Turn it off if you compose schemas in `allOf`
 * because it's clearer.
 *
 * A schema can be moved if the schema it's in, with its keywords in it,
 * means what the two mean separately. A keyword in both is combined: arrays
 * are joined, like `required`'s names, and objects are merged if they
 * don't have a name in common with a different value, like `properties`
 * and other maps. A keyword with the same value in both is kept once.
 * Whether that means the same comes from what the keywords lower to, so a
 * keyword moved next to one it reads, or that reads it, like
 * `additionalProperties` and `properties`, or `if` and `then`, isn't, and
 * neither is `anyOf` combined with `anyOf`. It works for custom keywords
 * too, including the siblings a keyword that doesn't lower declares it
 * reads.
 *
 * A schema with an identifier, like `$id` or `$anchor` (a keyword with a
 * `resolve` hook), or definitions, whose URIs would change, can't be moved,
 * and neither can one with a keyword that reads what its siblings
 * evaluated, like `unevaluatedProperties`. A schema a `$ref` refers to
 * isn't in the schema, so it isn't reported. From 2019-09, `$ref` is a
 * keyword like any other, so `allOf: [{ "$ref": … }]` is reported. In
 * draft-04 through draft-07, a schema that's a `$ref` replaces the schema
 * it's in, so it's only reported if it's the only schema in `allOf` and
 * there's nothing but `allOf` in the schema it's in. Booleans aren't
 * reported.
 *
 * It only looks at the schema and the schemas in it, not at what they
 * reference, so it doesn't matter what a `$ref` refers to. A reference into
 * a moved schema, like `#/allOf/0/properties/a`, would need to change too,
 * which this rule doesn't look for. It has no options.
 */
declare const mergeableSchemas: Plugin<JsonSchemaDocumentNode, void>;
export default mergeableSchemas;
