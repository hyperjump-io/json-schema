import type { JsonSchemaDocumentNode, JsonSchemaKeywordNode, JsonSchemaNode, JsonSchemaTolerantNode } from "../schema/schema-ast.d.ts";

/**
 * Calls `visitor` with every schema in the document, including embedded
 * resources, which stay in the tree. Values that couldn't be parsed aren't
 * schemas, so they aren't visited.
 */
export const visitSchemas: (
  tree: JsonSchemaDocumentNode,
  visitor: (schemaNode: JsonSchemaNode) => void
) => void;

/**
 * Calls `visitor` with every keyword in the document that has the given
 * keyword URI, and the schema it's in. Keywords are found by URI, never by
 * name, so a rule works in every dialect that has the keyword and does
 * nothing in one that doesn't.
 */
export const visitKeywords: (
  tree: JsonSchemaDocumentNode,
  keywordUri: string,
  visitor: (keywordNode: JsonSchemaKeywordNode, schemaNode: JsonSchemaNode) => void
) => void;

/**
 * Calls `visitor` with every static reference in the document and the
 * absolute URI it refers to. That's the value of a `$ref` keyword (2019-09
 * and later), resolved against the schema resource it's in, or a schema
 * that's a reference (`$ref` in draft-04 through draft-07). `node` is the
 * `$ref` keyword's value or the reference.
 *
 * Dynamic references (`$dynamicRef`, `$recursiveRef`) aren't visited,
 * because what they refer to depends on evaluation.
 */
export const visitReferences: (
  tree: JsonSchemaDocumentNode,
  visitor: (uri: string, node: JsonSchemaNode) => void
) => void;

/**
 * An official dialect's URI as its meta-schema identifies itself, like
 * `http://json-schema.org/draft-07/schema#` with its empty fragment, given
 * its URI without a fragment. It's undefined for any other dialect.
 */
export const canonicalDialectUri: (dialectUri: string) => string | undefined;

/**
 * Calls `visitor` with the value of every `$schema` in the document that's
 * a string, including in schemas that are references (draft-04 through
 * draft-07), where `$schema` still decides the dialect.
 */
export const visitDialectUris: (
  tree: JsonSchemaDocumentNode,
  visitor: (valueNode: JsonSchemaNode & { jsonType: "string" }) => void
) => void;

/**
 * A keyword in a schema, by keyword URI. It's undefined if the schema
 * doesn't have the keyword or isn't an object. Use it instead of
 * {@link siblingKeyword} when you need the keyword's name or position, not
 * just its value.
 */
export const findKeyword: (schemaNode: JsonSchemaNode, keywordUri: string) => JsonSchemaKeywordNode | undefined;

/**
 * The value of a sibling keyword, by keyword URI, such as `if` for `then`.
 * It's undefined if the schema doesn't have the keyword or isn't an object.
 */
export const siblingKeyword: (schemaNode: JsonSchemaNode, keywordUri: string) => JsonSchemaNode | undefined;

/**
 * A schema's `required` keyword, in any dialect, and the distinct property
 * names it requires. Items that aren't strings are left out. It's undefined
 * if the schema doesn't have `required` or its value isn't an array.
 */
export const requiredNames: (schemaNode: JsonSchemaNode) => { keywordNode: JsonSchemaKeywordNode; names: Set<string> } | undefined;

/**
 * A schema's `type` keyword, in any dialect, and the types it allows. It's
 * undefined if the schema doesn't have `type`, or its value isn't a string
 * or a non-empty array of strings.
 */
export const typeNames: (schemaNode: JsonSchemaNode) => { keywordNode: JsonSchemaKeywordNode; names: Set<string> } | undefined;

/**
 * Whether `type` allows a value, as the `type` keyword decides it, given the
 * types from {@link typeNames}. A number with no fractional part, including
 * one written like `1.0`, is an `integer`. It's undefined for a value that
 * couldn't be parsed.
 */
export const typeAllows: (names: Set<string>, valueNode: JsonSchemaTolerantNode) => boolean | undefined;

/**
 * The schemas in a schema's `properties`, `patternProperties`, and
 * `additionalProperties` that apply to a property with the given name, each
 * with the keyword it's in. Patterns are compiled as `patternProperties`
 * compiles them. `additionalProperties` applies only if the others don't.
 * It's undefined if a pattern isn't valid, because then what applies is
 * unknown.
 */
export const propertySchemas: (schemaNode: JsonSchemaNode, name: string) => { keywordNode: JsonSchemaKeywordNode; valueNode: JsonSchemaNode }[] | undefined;

/**
 * The type of value a keyword applies to, by keyword URI, in every dialect,
 * like `object` for `properties`. It's undefined for a keyword that applies
 * to every type, like `enum`. `format` depends on the format, which says
 * which types it applies to.
 */
export const keywordType: (keywordUri: string) => "number" | "string" | "array" | "object" | undefined;
