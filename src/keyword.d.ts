import type { Node } from "unist";
import type { VFileMessage } from "vfile-message";
import type { JsonErrorNode, JsonNode } from "@hyperjump/browser/json";

/**
 * The definition of a keyword. A dialect maps keyword names to these by URI.
 */
// TODO: Compiling and evaluating keywords
export type Keyword = {
  /**
   * Identifies the keyword independent of its name in any dialect. Use a
   * domain you control to avoid conflicts.
   */
  uri: string;

  /** Where the keyword's value contains schemas */
  shape: Shape;

  /**
   * Called while a schema document is resolved, for keywords that affect how
   * the document is identified, such as `$id`, `$anchor`, and `$dynamicAnchor`.
   * Most keywords don't need it.
   *
   * The context only records what the keyword asks for. The effects are
   * applied after every keyword in the schema has been seen, so the order of
   * keywords doesn't matter.
   */
  resolve?: (valueNode: JsonNode<{ type: "json" }, JsonErrorNode> | JsonErrorNode, context: ResolveContext) => void;
};

/**
 * Describes which parts of a keyword's value are schemas.
 *
 * - `"schema"` matches an object or a boolean.
 * - `{ array: Shape }` matches an array whose items have the given shape.
 * - `{ map: Shape }` matches an object whose property values have the given
 *   shape.
 * - `"data"` matches anything. Nothing in it is a schema.
 * - An array of shapes uses the first alternative that matches the value's
 *   JSON type.
 *
 * A value that doesn't match is treated as `"data"`. It's up to the
 * meta-schema to report it.
 *
 * | Keyword                    | Shape                                         |
 * | -------------------------- | --------------------------------------------- |
 * | `not`, `items` (2020-12)   | `"schema"`                                    |
 * | `allOf`, `prefixItems`     | `{ array: "schema" }`                         |
 * | `properties`, `$defs`      | `{ map: "schema" }`                           |
 * | `items` (draft-04)         | `["schema", { array: "schema" }]`             |
 * | `dependencies` (draft-04)  | `{ map: ["schema", "data"] }`                 |
 * | `propertyDependencies`     | `{ map: { map: "schema" } }`                  |
 * | `conditional`              | `{ array: ["schema", { array: "schema" }] }`  |
 * | `const`, `enum`, `default` | `"data"`                                      |
 */
export type Shape = "schema" | "data" | { array: Shape } | { map: Shape } | Shape[];

export type ResolveContext = {
  /**
   * The base URI the schema is in before any identifier in the schema
   * applies.
   */
  baseUri: string;

  /** The dialect of the schema */
  dialectUri: string;

  /**
   * Make the schema the root of a new schema resource with the given URI.
   * The URI must be absolute and without a fragment. Its dialect is
   * determined again, so `$schema` can change it.
   */
  setBaseUri: (uri: string) => void;

  /** Add a plain-name fragment that identifies the schema */
  addAnchor: (name: string) => void;

  /** Add a dynamic anchor that identifies the schema */
  addDynamicAnchor: (name: string) => void;

  /**
   * Make the schema a reference node. Every other property of the schema is
   * ignored, including ones that would set a base URI or add an anchor. This
   * is for `$ref` in dialects where it replaces the whole object, such as
   * draft-04 through draft-07.
   *
   * @param href - Resolved against `baseUri` if it's relative
   */
  setReference: (href: string) => void;

  /**
   * Report a problem with the keyword, such as an invalid identifier. It's
   * added to the file's messages. The node defaults to the keyword's value.
   */
  message: (reason: string, node?: Node) => VFileMessage;
};
