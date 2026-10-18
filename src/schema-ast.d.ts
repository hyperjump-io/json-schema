import type { Data } from "unist";
import type {
  JsonCommentNode,
  JsonErrorNode,
  JsonNode,
  JsonParseStatus,
  JsonPropertyNode,
  JsonStatusChildren
} from "@hyperjump/browser/json";

/**
 * A node in a schema document. A schema AST is a JSON AST with some nodes
 * annotated. Nothing is moved, added, or removed, so it stringifies back to
 * the original document and every node keeps its position.
 *
 * - `json`: A value that isn't a schema, such as the value of `const`, an
 *   item in `required`, or the object that holds the subschemas of
 *   `properties`.
 * - `json-schema`: An object or boolean schema. Each property of an object
 *   schema is a {@link JsonSchemaKeywordNode}.
 * - `reference`: A `$ref` in a dialect where `$ref` replaces the whole
 *   object, such as draft-04 through draft-07. It works like a JRef
 *   reference, so `@hyperjump/browser` follows it automatically. Its other
 *   properties are ignored, so they're plain JSON and not keywords.
 *
 * A node's `location` is relative to the schema resource that contains it.
 * Nodes in an embedded resource use that resource's URI, not the URI of the
 * document it's embedded in. That makes `location` the node's canonical URI.
 *
 * `X` works the same way as it does for `JsonNode`.
 */
export type JsonSchemaNode<X = never> = JsonNode<JsonSchemaAnnotations, X, JsonSchemaPropertyAnnotations>;

/** The annotations of value nodes. See {@link JsonSchemaNode}. */
export type JsonSchemaAnnotations = {
  type: "json";
} | {
  type: "json-schema";
  /** The dialect of the schema resource this schema belongs to */
  dialectUri: string;
} | {
  type: "reference";
  /** The resolved URI of the reference */
  href: string;
};

/**
 * The annotations of property nodes. Only the properties of an object schema
 * have a `keywordUri`. See {@link JsonSchemaKeywordNode}.
 */
export type JsonSchemaPropertyAnnotations = {
  keywordUri?: undefined;
} | {
  keywordUri: string;
};

/**
 * A schema node from a parse whose status is `failure`.
 */
export type JsonSchemaTolerantNode = JsonSchemaNode<JsonErrorNode>;

/**
 * A property of an object schema.
 */
export type JsonSchemaKeywordNode<X = never> = JsonPropertyNode<JsonSchemaAnnotations, X, JsonSchemaPropertyAnnotations> & {
  /**
   * The URI of the keyword in the schema's dialect. A property that isn't a
   * keyword in the dialect gets `https://json-schema.org/keyword/unknown#`
   * followed by the property name. The dialect, usually through its
   * meta-schema, decides whether unknown keywords are allowed.
   */
  keywordUri: string;
};

/**
 * A schema resource. The root of a schema document is a schema resource, and
 * so is every subschema with an identifier (`$id`, or `id` in draft-04).
 *
 * Every resource in a document shares the same `embedded` object and has an
 * entry in it, so any resource in the document can find any other.
 * An embedded resource's root is the same node that appears at that location
 * in the tree of the document that contains it. It isn't copied or removed.
 *
 * `S` works the same way as it does for `JsonDocumentNode`.
 */
export type JsonSchemaDocumentNode<S extends JsonParseStatus = JsonParseStatus> = {
  type: "json-schema-document";
  status: S;
  children: JsonStatusChildren<S, JsonSchemaNode, JsonSchemaTolerantNode>;

  /** See `JsonDocumentNode` */
  comments: JsonCommentNode[];

  /** The resource's base URI. Always absolute and without a fragment. */
  uri: string;

  /**
   * The dialect of the resource. It's undefined if no dialect could be
   * determined, in which case nothing in the resource is a schema.
   */
  dialectUri?: string;

  /**
   * The vocabularies of the dialect the resource defines as a meta-schema,
   * from a resolve hook such as `$vocabulary`'s. Vocabulary URIs are mapped to
   * whether they're required. The dialect is identified by any URI the
   * resource is found by.
   */
  vocabularies?: Record<string, boolean>;

  /**
   * Always `application/schema+json`, so `@hyperjump/browser` interprets
   * fragments with the schema media type plugin, even for an embedded
   * resource it didn't parse.
   */
  mediaType: "application/schema+json";

  /** Plain-name fragments (`$anchor`) mapped to JSON Pointers */
  anchors: Record<string, string>;

  /**
   * Dynamic anchors (`$dynamicAnchor`) mapped to JSON Pointers. 2019-09's
   * `$recursiveAnchor: true` is a dynamic anchor named `""`.
   */
  dynamicAnchors: Record<string, string>;

  /** Every resource in the document by URI, shared by all of them */
  embedded: Record<string, JsonSchemaDocumentNode<S>>;

  data?: Data;
};
