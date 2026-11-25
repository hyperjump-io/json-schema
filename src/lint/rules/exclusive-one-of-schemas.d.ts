import type { Plugin } from "unified-lint-rule";
import type { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts";

/**
 * A `oneOf` whose schemas can't match the same value, like schemas with
 * different `type`s or different `const`s for a required property. At most
 * one of them can match, so `anyOf` means the same. `anyOf` says less to
 * check: an implementation can stop at the first schema that matches,
 * where `oneOf` has to try the rest, and a failure doesn't have to explain
 * why no other schema matched.
 *
 * It's a matter of style. `oneOf` says the schemas are alternatives, which
 * some prefer, and some tools read it that way, so it isn't in a preset.
 *
 * Schemas are compared by what they mean, as far as that's known without
 * trying values: types, `const` and `enum` values, limits with a `type`,
 * a required property's schemas, and `not`, through references in the
 * document. So it doesn't find every `oneOf` like this, but the ones it
 * reports are. It isn't reported in a dialect without `anyOf`. It has no
 * options.
 */
declare const exclusiveOneOfSchemas: Plugin<JsonSchemaDocumentNode, void>;
export default exclusiveOneOfSchemas;
