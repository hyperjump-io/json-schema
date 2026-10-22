import type { Plugin } from "unified-lint-rule";
import type { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts";

/**
 * `readOnly` and `writeOnly` both `true` in the same schema. A read-only
 * value can't be changed, and a write-only value is never retrieved, so
 * the value can't be used at all. One of them is likely a mistake. The
 * specs allow it, so it's lint.
 *
 * It only looks at one schema at a time. The annotations also combine
 * across schemas that apply to the same value, such as two in an `allOf`,
 * but which ones apply depends on the instance. It has no options.
 */
declare const readOnlyAndWriteOnly: Plugin<JsonSchemaDocumentNode, void>;
export default readOnlyAndWriteOnly;
