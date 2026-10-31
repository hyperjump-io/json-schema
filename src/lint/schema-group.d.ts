import type { JsonSchemaNode } from "../schema/schema-ast.d.ts";
import type { LintDocument } from "./document.d.ts";

/**
 * A schema that applies another to the same instance, found from the
 * expressions `from` lowers to.
 *
 * - `keywordUri`: The keyword `to` is in, like `allOf`, or `then` for a
 *   schema `if` applies, or the reference keyword for a reference, which is
 *   draft-07's `$ref` for a schema that's a reference.
 * - `reference`: `to` is what a reference refers to, not a subschema of
 *   `from`.
 * - `negated`: `to` is applied through an odd number of `not`s, so `from`
 *   passes where `to` fails.
 * - `condition`: `to` is applied as a condition, like `if`, so it doesn't
 *   have to pass.
 */
export type SchemaLink = {
  from: JsonSchemaNode;
  to: JsonSchemaNode;
  keywordUri: string;
  reference: boolean;
  negated: boolean;
  condition: boolean;
};

/**
 * The schemas that can apply to the same instance as a schema, and how
 * they're linked.
 *
 * - `schemas`: Every schema in the group, including the one it's for.
 * - `links`: Each link between them. Schemas in an `anyOf` can all apply, but
 *   don't all have to pass. Use the links to tell which ones must.
 * - `open`: The group has a schema that a document other than this one
 *   could apply, like the root or one in `$defs`. What else applies then
 *   isn't known.
 * - `applied`: Something in this document applies the group. It has the
 *   document's root, or a schema in a keyword that applies it to part of the
 *   instance, like `properties` or `items`. A group that isn't applied, like
 *   one in `$defs` that nothing here references, is only used from other
 *   documents, if at all.
 * - `unknown`: The group has a reference that couldn't be followed, like a
 *   `$dynamicRef`, or one to a document that can't be retrieved.
 */
export type SchemaGroup = {
  schemas: JsonSchemaNode[];
  links: SchemaLink[];
  open: boolean;
  applied: boolean;
  unknown: boolean;
};

/**
 * The group of schemas that can apply to the same instance as a schema.
 * They're the schemas connected to it through keywords that apply a schema
 * in place, like `allOf`, `anyOf`, and `if`, and through references, in
 * either direction. Which keywords do is found from what they lower to
 * (`LintDocument.reached`): a schema applied by `apply` outside the
 * operations on a property or an item. A schema an `opaque` operation
 * applies isn't linked, because where it applies isn't known. A reference
 * to another document is followed if it found something, along with what
 * that schema applies in place. What references a schema from another
 * document isn't known, which is what `open` says.
 *
 * What's found for a document is shared by every rule that uses it, and
 * every schema in a group gets the same group.
 */
export const schemaGroup: (document: LintDocument, schemaNode: JsonSchemaNode) => SchemaGroup;

/**
 * Whether a schema in a group is applied through an odd number of `not`s,
 * following the subschema links to it up to a schema that isn't a subschema
 * applied in place. References aren't followed. Its keywords then reject
 * what they'd otherwise allow. `required` in a `not` requires a property to
 * be missing.
 */
export const isNegated: (group: SchemaGroup, schemaNode: JsonSchemaNode) => boolean;

/**
 * Whether something in a group could read what its schemas mark as
 * evaluated: one of them has a keyword that reads marks, like
 * `unevaluatedProperties`, or isn't known, because it's in another
 * document, or the group is `unknown`. A group that's `open` could be
 * applied with an `unevaluated*` from another document too, which this
 * doesn't count.
 */
export const marksAreRead: (document: LintDocument, group: SchemaGroup) => boolean;
