import type { Plugin } from "unified-lint-rule";
import type { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts";

/**
 * A `const` value or a value in `enum` whose type the sibling `type` doesn't
 * allow, so it's never valid. For `const`, that means nothing is valid. It's
 * often a value that's quoted when it shouldn't be, like `"1"` for an
 * integer, or `null` in an `enum` when `type` doesn't include `"null"`.
 * Types are decided as the `type` keyword decides them, so `1.0` is an
 * integer. Each value is reported.
 *
 * It only looks at `type` in the same schema. It has no options.
 */
declare const constOrEnumValueForDisallowedType: Plugin<JsonSchemaDocumentNode, void>;
export default constOrEnumValueForDisallowedType;
