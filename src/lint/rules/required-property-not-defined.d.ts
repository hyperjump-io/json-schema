import type { Plugin } from "unified-lint-rule";
import type { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts";

/**
 * A property in `required` that no schema that can apply to the same object
 * defines, in `properties` or `patternProperties`. Any value is allowed for
 * it, and it's often a typo, like `"nmae"` for `"name"`.
 *
 * The schemas that can apply to the same object are the ones connected
 * through keywords that apply a schema in place, like `allOf`, `anyOf`, and
 * `if`, in either direction, and references, in either direction within
 * the document. So `required` in an `anyOf` is defined by `properties` next
 * to the `anyOf`, and a schema in `$defs` is defined by the schemas that
 * reference it. A reference to another document is followed, but what
 * references this one from another document isn't known. So a group of
 * schemas that defines no properties, and could be referenced from
 * elsewhere, like the root or one in `$defs`, isn't reported, because
 * it's likely meant to be combined with one that does.
 *
 * `additionalProperties` and `unevaluatedProperties` define every property.
 * Nothing is reported for a group with a reference that can't be followed,
 * like `$dynamicRef` or one to a document that can't be retrieved, or for
 * `required` in a `not`, which requires a property to be missing. A required
 * property that isn't allowed is reported by `required-property-not-allowed`.
 * It has no options.
 */
declare const requiredPropertyNotDefined: Plugin<JsonSchemaDocumentNode, void>;
export default requiredPropertyNotDefined;
