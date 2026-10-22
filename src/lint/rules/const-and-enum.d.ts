import type { Plugin } from "unified-lint-rule";
import type { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts";

/**
 * `const` and `enum` in the same schema. `const` allows only one value. If
 * that value is in `enum`, `enum` has no effect, and it's reported. If it
 * isn't, nothing is valid against the schema, and whichever comes second is
 * reported. Values are compared as JSON Schema does. The specs allow it, so
 * it's lint.
 *
 * It only looks at one schema at a time, not at `const` and `enum` in
 * different schemas that apply to the same value, such as two in an
 * `allOf`. It has no options.
 */
declare const constAndEnum: Plugin<JsonSchemaDocumentNode, void>;
export default constAndEnum;
