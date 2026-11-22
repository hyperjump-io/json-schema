import type { Plugin } from "unified-lint-rule";
import type { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts";

/**
 * An embedded schema resource whose `$schema` names a different dialect
 * from the 2019-09 schema it's in. 2019-09 says a document's schema
 * resources should have the same `$schema`, and what a different one does
 * is up to the implementation. This implementation reads it in the dialect
 * it names, but another might not, so it's a warning. 2020-12 and later
 * allow any dialect there, and draft-04 through draft-07 don't allow
 * `$schema` there at all, which `misplaced-dialect` reports.
 * It has no options.
 */
declare const embeddedDialectChange: Plugin<JsonSchemaDocumentNode, void>;
export default embeddedDialectChange;
