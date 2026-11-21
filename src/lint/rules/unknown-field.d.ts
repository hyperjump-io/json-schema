import type { Plugin } from "unified-lint-rule";
import type { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts";

/**
 * A field that OpenAPI's Discriminator, External Documentation, or XML
 * Object doesn't define, in `discriminator`, `externalDocs`, or `xml`, like
 * `propertyname` for `propertyName`. OpenAPI doesn't say they MUST NOT be
 * there, so it's lint, but tools ignore them, so it's likely a typo. A
 * field that's a known one in a different case says which. `x-` fields are
 * Specification Extensions and aren't reported. The fields are the
 * keyword's version's: 3.2 adds `defaultMapping` and `nodeType`. It has no
 * options.
 */
declare const unknownField: Plugin<JsonSchemaDocumentNode, void>;
export default unknownField;
