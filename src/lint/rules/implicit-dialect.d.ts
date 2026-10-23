import type { Plugin } from "unified-lint-rule";
import type { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts";

/**
 * A root schema without `$schema` whose dialect came from somewhere else:
 * the `dialectUri` option of `jsonSchemaResolve`, such as a `schema` media
 * type parameter, or the `defaultDialectUri` config. Other tools, and this
 * one loaded differently, don't know the dialect, or assume a different
 * one. Every spec from draft-06 on says `$schema` SHOULD be in the root
 * schema. draft-04 doesn't say, but the same problem applies.
 *
 * A root without `$schema` whose dialect can't be determined is an error
 * from the resolver instead, which is always the case in the CLI, because
 * it has no default dialect. A boolean root schema can't have `$schema`, so
 * it isn't reported, and neither is a draft-04–07 root with `$ref`, because
 * the resolver doesn't give that document a dialect. It has no options.
 */
declare const implicitDialect: Plugin<JsonSchemaDocumentNode, void>;
export default implicitDialect;
