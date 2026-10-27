import type { Plugin } from "unified-lint-rule";
import type { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts";

/**
 * An `unevaluatedProperties` or `unevaluatedItems` that never sees a
 * property or item that isn't evaluated, because the other keywords in its
 * schema evaluate every one whenever they pass, like
 * `additionalProperties: false` next to `unevaluatedProperties: false`, or
 * an `allOf` schema with `items`. It always passes, so it has no effect.
 *
 * From what they lower to, that's `eachProperty` with an `except` selector
 * whose names and patterns are marked too, `eachItem` from an index whose
 * items before it are marked, or another `unevaluated` selector. Only what's
 * marked whenever the schema passes counts: something every branch of an
 * `anyOf`, `oneOf`, or `if` marks does, and something only one of them
 * marks doesn't. One with a schema that allows everything, like
 * `unevaluatedProperties: true`, is reported by `empty-catch-all-schema`
 * too.
 */
declare const unevaluatedWithoutEffect: Plugin<JsonSchemaDocumentNode, void>;
export default unevaluatedWithoutEffect;
