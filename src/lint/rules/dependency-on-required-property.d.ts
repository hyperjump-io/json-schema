import type { Plugin } from "unified-lint-rule";
import type { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts";

/**
 * A dependency on a property that's already required, in
 * `dependentRequired`, `dependentSchemas`, or `dependencies` (draft-04
 * through draft-07). A dependency applies when the property is present, and
 * a required property is always present, so the dependency always applies.
 * Its properties belong in `required`, or its schema in `allOf`. It may
 * also mean the property wasn't meant to be required. It's the same for an
 * `if` whose schema only requires properties that are already required:
 * it always passes.
 *
 * A property is required if every object that passes the schema's other
 * keywords has it, so `required` in an `allOf`, or in a schema a `$ref`
 * applies, counts too. It doesn't report a dependent property that's already
 * required, which `required-dependent-property` reports. It has no options.
 */
declare const dependencyOnRequiredProperty: Plugin<JsonSchemaDocumentNode, void>;
export default dependencyOnRequiredProperty;
