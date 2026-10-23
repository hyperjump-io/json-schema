import type { Plugin } from "unified-lint-rule";
import type { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts";

/**
 * An assertion next to `const` or `enum` that allows the `const` value or
 * every value in `enum`, like `minLength: 3` next to `enum: ["one", "two"]`,
 * so it has no effect. Only those values can be valid, and it allows all of
 * them.
 *
 * The assertions checked are the limits (`minimum`, `maxLength`,
 * `maxItems`, `minProperties`, and so on), `multipleOf`, `pattern`,
 * `uniqueItems`, `required`, and `dependentRequired`. `type` is reported by
 * `type-implied-by-const-or-enum`, and `format` only asserts if formats are
 * validated, so it isn't checked. Keywords that apply schemas aren't
 * checked either. An assertion that rejects a value is reported by
 * `const-or-enum-value-rejected`.
 *
 * It compiles a schema for each assertion next to a `const` or `enum`, so
 * it can be expensive on large schemas, and it isn't in `recommended`.
 * It has no options.
 */
declare const assertionImpliedByConstOrEnum: Plugin<JsonSchemaDocumentNode, void>;
export default assertionImpliedByConstOrEnum;
