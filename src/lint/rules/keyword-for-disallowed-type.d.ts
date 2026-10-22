import type { Plugin } from "unified-lint-rule";
import type { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts";

/**
 * A keyword that applies only to one type of value, like `minimum` to
 * numbers or `properties` to objects, in a schema whose `type` doesn't allow
 * that type. Any value it would apply to is invalid anyway, so it never
 * does anything. It's likely a typo in `type` or a keyword in the wrong
 * schema. `integer` allows the keywords for numbers.
 *
 * A `format` is reported if its definition says which types it applies to
 * (`types`), as every format JSON Schema defines does. A format the dialect
 * doesn't support, whose definition hasn't been added, or that doesn't say,
 * could apply to any type, so it isn't. It only
 * looks at `type` in the same schema, not in another schema that
 * applies to the same value, such as one in an `allOf`. It has no options.
 */
declare const keywordForDisallowedType: Plugin<JsonSchemaDocumentNode, void>;
export default keywordForDisallowedType;
