import type { Plugin } from "unified-lint-rule";
import type { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts";

/**
 * A keyword that's the same as leaving it out, from what it lowers to. Its
 * group always passes and doesn't annotate or mark anything, following the
 * schemas it applies, so a schema with no effect counts as `true`. For
 * example, `properties: {}`, `required: []`, `minLength: 0`,
 * `uniqueItems: false`, `propertyNames: {}`, or `allOf: [{}]`. A sibling
 * that the keywords that read it lower the same without is reported too,
 * like `minContains: 1` or draft-04's `exclusiveMaximum: false`.
 *
 * A keyword that only marks particular properties or items as evaluated,
 * like `properties: { "a": true }`, is reported only if nothing in its
 * schema group reads marks and the group isn't open. An `unevaluated*` in
 * another document can read the marks of a schema it references, which is
 * a good reason to write one. Any subschema could be referenced from
 * another document, but the rule assumes only the root and definitions are
 * (see `SchemaGroup`'s `open`).
 *
 * A keyword that applies a schema with no effect to every property or item
 * others don't is `empty-catch-all-schema`'s. One without effect because of
 * its siblings, like `if` without `then` or `else`, is left to the rules
 * about those siblings, and unknown keywords to `unknown-keyword`.
 *
 * References are followed, into other documents too, so `$ref` to a schema
 * with no effect has no effect. One that can't be followed has an effect.
 */
declare const keywordWithoutEffect: Plugin<JsonSchemaDocumentNode, void>;
export default keywordWithoutEffect;
