import type { Plugin } from "unified-lint-rule";
import type { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts";

/**
 * A property that no valid object can have, because an object with it
 * needs more properties than `maxProperties` allows, though objects without
 * it are valid. It's usually a dependency, like `dependentRequired` with
 * `"a": ["b", "c"]` and `maxProperties: 2`, or a property in `properties`
 * when the required properties already use up `maxProperties`.
 *
 * The properties it checks are the ones a keyword in the schema applies a
 * schema to or makes something depend on. What an object needs counts
 * everything `contradictory-limits` counts: required properties,
 * dependencies, and schemas that apply to the same object. If no object is
 * valid at all, `contradictory-limits` reports it instead. The message is on
 * `maxProperties` and on the property's entry in each keyword that names
 * it. It has no options.
 */
declare const impossibleProperty: Plugin<JsonSchemaDocumentNode, void>;
export default impossibleProperty;
