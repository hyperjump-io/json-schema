import type { Plugin } from "unified-lint-rule";
import type { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts";

/**
 * A schema in `allOf` or `anyOf` that another schema in it makes
 * redundant, so the keyword says the same without it. In `anyOf`, it's a
 * schema that allows nothing another one doesn't, like `"maximum": 3` next
 * to `"maximum": 4`. In `allOf`, it's a schema that allows everything
 * another one does, like `"maximum": 4` next to `"maximum": 3`. It may be
 * a limit that was meant to be different, or a schema that was meant to be
 * in `oneOf`.
 *
 * Schemas are compared by what they mean, as far as that's known without
 * trying values: types, limits, `const` and `enum` values, required
 * properties, and the same comparison of the schemas for properties and
 * items, through references in the document. Anything else, like
 * `pattern`, is only known to allow what the same keyword with the same
 * value allows. So it doesn't find every redundant schema, but the ones it
 * reports are. Of two schemas that allow the same, the later one is
 * reported, which `duplicate-all-of-any-of-schemas` reports too.
 *
 * A schema that annotates, like one with a `title`, isn't reported,
 * because the annotation is an effect. Neither is one that evaluates
 * properties or items where an `unevaluatedProperties` or
 * `unevaluatedItems` might depend on it. It has no options.
 */
declare const redundantAllOfAnyOfSchemas: Plugin<JsonSchemaDocumentNode, void>;
export default redundantAllOfAnyOfSchemas;
