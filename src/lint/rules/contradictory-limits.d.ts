import type { Plugin } from "unified-lint-rule";
import type { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts";

/**
 * A lower limit above its upper limit, so no value of the type they limit
 * is valid. Values of other types still are, so the schema doesn't fail
 * everything, but it's rarely what's meant.
 *
 * - Numbers: the tightest of `minimum` and `exclusiveMinimum` against the
 *   tightest of `maximum` and `exclusiveMaximum`, in draft-04's form, where
 *   `exclusiveMinimum` and `exclusiveMaximum` are booleans, and later ones,
 *   where they're numbers. Equal limits are reported if either is
 *   exclusive.
 * - Strings, arrays, and objects: `minLength` and `maxLength`, `minItems`
 *   and `maxItems`, and `minProperties` and `maxProperties`.
 * - `required` with more distinct properties than `maxProperties` allows.
 * - `minContains` and `maxContains`, if there's a `contains`. Without one,
 *   they have no effect, which `min-max-contains-without-contains`
 *   reports.
 *
 * It only compares limits in the same schema. It has no options.
 */
declare const contradictoryLimits: Plugin<JsonSchemaDocumentNode, void>;
export default contradictoryLimits;
