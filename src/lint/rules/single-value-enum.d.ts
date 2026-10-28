import type { Plugin } from "unified-lint-rule";
import type { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts";

/**
 * `enum` with only one value, like `["foo"]`, which `const: "foo"` says
 * more directly. Draft-04 doesn't have `const`, so it isn't reported there.
 * The dialect's name for `const` is looked up, so custom dialects are
 * covered too. `enum` next to `const` isn't reported, because `const` can't
 * replace it. `keyword-implied-by-const-or-enum` or
 * `const-or-enum-value-rejected` reports it. It has no options.
 */
declare const singleValueEnum: Plugin<JsonSchemaDocumentNode, void>;
export default singleValueEnum;
