import type { Node } from "unist";
import type { VFileMessage } from "vfile-message";
import type { Json, JsonErrorNode, JsonNode, JsonType, ReadonlyJson } from "@hyperjump/browser/json";
import type { JsonSchemaNode, JsonSchemaTolerantNode } from "./schema/schema-ast.d.ts";
import type { Dialect, DialectDefinition } from "./dialect.d.ts";
import type { Expression, Handle } from "./kernel/kernel.d.ts";
import type { JsonSchema } from "./json-schema.d.ts";

/**
 * The definition of a keyword. A dialect maps keyword names to these by URI.
 *
 * Keywords are stateless so one definition can be shared by every
 * `JsonSchema` instance and every dialect. A keyword says what it means by
 * lowering its value to a kernel expression (`lower`). Evaluating,
 * optimizing, and output formats only work with expressions.
 *
 * `V` is the type of the value `lower` gets, `Sh` the type of its
 * {@link shape}, and `S` the type of its siblings' values. Together, `V` and
 * a literal `Sh` give the type of the keyword's value in a schema (see
 * {@link KeywordValue}).
 */
export type Keyword<V = any, Sh extends Shape = Shape, S extends Record<string, any> = Record<string, any>> = {
  /**
   * Identifies the keyword independent of its name in any dialect. Use a
   * domain you control to avoid conflicts.
   */
  uri: string;

  /** Where the keyword's value contains schemas */
  shape: Sh;

  /**
   * The keywords in the same schema whose values this keyword reads, like
   * `properties` for `additionalProperties`, by a name of the keyword's
   * choosing. `lower` gets their values by those names, and so does `check`
   * (`context.siblings`). Neither can read any other sibling. Moving the
   * keyword away from them, or next to them, changes what it means, so tools
   * that move keywords between schemas, like lint rules, need to know.
   *
   * ```js
   * siblings: { properties: "https://json-schema.org/keyword/properties" }
   * ```
   */
  siblings?: Record<string, string>;

  /**
   * Report problems with the keyword's value that its {@link shape} doesn't
   * describe, like `minLength` being negative. Without it, any value that
   * fits the shape is allowed.
   *
   * It's called while the schema is resolved, after the value is annotated,
   * so the subschemas in it are `json-schema` nodes. They're checked as
   * schemas in their own right, and a value that doesn't fit the shape has
   * already been reported. It isn't called for a value that couldn't be
   * parsed, but a value inside it can be a `json-invalid` or `json-missing`
   * node, which already has a syntax error.
   */
  check?: (valueNode: JsonSchemaTolerantNode, context: CheckContext) => void;

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

  /**
   * What the keyword means, as a kernel expression (see `kernel.d.ts`). It's
   * called once per schema when the schema is compiled. A keyword without
   * it has no keyword group, like `$id`. A keyword that has a group but no
   * effect, like `uniqueItems: false`, lowers to `pass`, so plugins still
   * see it.
   *
   * `value` is the keyword's value parsed by its {@link shape}: a schema is
   * its expression (`{ op: "apply", schema: handle }`), a reference is a
   * {@link Reference}, a map is its pairs in order, an array is an array,
   * and data and unapplied schemas are JSON. `siblings` are the values of
   * the siblings the keyword declares ({@link siblings}), parsed by their
   * own shapes, by the names it gives them. A sibling that isn't in the
   * schema is undefined.
   *
   * It's synchronous and only reads its inputs and the context. The kernel
   * compiles the schemas in them and retrieves what references refer to.
   */
  lower?: (value: V, siblings: S, context: LowerContext) => Expression;

  /**
   * Evaluate an escape hatch the keyword lowered to, a `predicate` or an
   * `opaque` operation (see `kernel.d.ts`). Only keywords that can't be said
   * with the kernel's other operations need it. It's called once for each
   * operation when an evaluator is built, with the operation's `value`, and
   * returns what evaluates an instance, so work that only depends on the
   * value is done once. An `opaque` operation's schemas are in the context,
   * not the value.
   *
   * An evaluator is built for plain values and for ASTs, so `context.instance`
   * is how the instance is read. The context's functions only work while the
   * returned function is evaluating an instance, so don't keep them for later.
   */
  evaluate?: <I>(value: Json, context: EvaluateContext<I>) => (instance: I) => boolean;
};

/**
 * What a keyword's {@link Keyword.evaluate} gets: a {@link PredicateContext}
 * or an {@link OpaqueContext}, by the operation it's evaluating
 */
export type EvaluateContext<I> = PredicateContext<I> | OpaqueContext<I>;

/**
 * For a `predicate`. The instance is always of the operation's `types`. It
 * applies no schemas and marks nothing.
 */
export type PredicateContext<I> = {
  op: "predicate";

  /** The instance evaluating the schema */
  jsonSchema: JsonSchema;

  instance: InstanceOps<I>;
};

/** For an `opaque` operation, which applies schemas */
export type OpaqueContext<I> = {
  op: "opaque";

  /** The instance evaluating the schema */
  jsonSchema: JsonSchema;

  instance: InstanceOps<I>;

  /**
   * Whether every subschema needs to be evaluated, because errors,
   * annotations, or marks are being collected. When it's false, the keyword
   * can stop as soon as its result is known.
   */
  exhaustive: boolean;

  /**
   * The evaluators of the operation's `schemas`, in the same order. Pass
   * `segment` when evaluating a property or item of the instance, so errors
   * and annotations get the right instance location. Leave it out when
   * evaluating the same instance. A schema evaluated on the same instance
   * marks what it marks for the keyword, if it passes.
   */
  schemas: ((instance: I, segment?: string | number) => boolean)[];

  /**
   * Record that the keyword evaluated a property (by name) or an item (by
   * index) of the instance. Like annotations, marks are kept only if the
   * keyword and every schema it was evaluated through pass. It does nothing
   * when nothing reads marks.
   */
  markEvaluated: (key: string | number) => void;

  /**
   * Add an annotation for the instance. It's kept only if the keyword and
   * every schema it was evaluated through pass. Plugins see it either way.
   * It's undefined when nothing can see annotations, so a keyword can skip
   * work it only does to annotate.
   */
  annotate?: (value: Json) => void;

  /**
   * The properties or items marked so far on the instance, by the keyword's
   * siblings and what they applied. It's only defined if the operation
   * `reads` `evaluated`.
   */
  evaluated?: () => ReadonlySet<string | number>;

  /**
   * The evaluator of the outermost schema in the dynamic scope with the
   * given dynamic anchor, if there is one. It's only defined if the
   * operation `reads` `dynamicScope`.
   */
  dynamicAnchor?: (name: string) => ((instance: I, segment?: string | number) => boolean) | undefined;
};

/** What a keyword's `lower` gets for a value of a {@link Shape} */
export type LowerInput = Expression | Reference | Json | LowerInput[] | [string, LowerInput][];

/** A reference, as `lower` gets it: where it resolved to, and what's known about that */
export type Reference = {
  /** The absolute URI it resolves to */
  uri: string;

  /** The schema it refers to (`{ op: "apply", schema: handle }`) */
  schema: Expression;

  handle: Handle;

  /**
   * The dynamic anchors of the schema resource it resolved to, for rules
   * like 2020-12's bookending, which decide whether a reference uses the
   * dynamic scope. It's undefined when lint lowers a document and the
   * resource isn't in it. Then a reference that might use the dynamic scope
   * should lower to `dynamicApply`, which can only overstate what applies.
   */
  dynamicAnchors: Record<string, Handle> | undefined;
};

export type LowerContext = {
  /** The instance compiling the schema */
  jsonSchema: JsonSchema;

  /** The dialect of the schema the keyword is in */
  dialect: Dialect;

  /**
   * The keyword's name in the schema. Unknown keywords share one definition
   * and use this to tell themselves apart.
   */
  keywordName: string;
};

/**
 * Operations for looking at an instance without knowing how it's
 * represented. In a tree from an error-tolerant parse, values that couldn't
 * be parsed (`json-missing` and `json-invalid` nodes) don't have a type.
 * Keywords that check the type first skip them, so the syntax error is the
 * only error reported for them.
 */
// TODO: Benchmark whether sharing keyword code between kinds of instances makes evaluation slower
export type InstanceOps<I> = {
  /** Undefined for a value that couldn't be parsed */
  typeOf: (instance: I) => JsonType | undefined;

  /**
   * The instance as a JS value. This is a copy for an array or object node.
   * For a JS value, it's the value being evaluated, so don't change it.
   */
  value: (instance: I) => ReadonlyJson;

  /** The number of items in an array or properties in an object */
  length: (instance: I) => number;

  /** Whether an object has a property, even one whose value is missing */
  has: (instance: I, name: string) => boolean;

  /** A property of an object or an item of an array */
  get: (instance: I, key: string | number) => I | undefined;

  entries: (instance: I) => Iterable<[string, I]>;

  /**
   * The property names of an object as instances, for keywords that
   * evaluate them (`propertyNames`). They're strings, or property name nodes
   * in an AST, so annotations are attached to the names.
   */
  keys: (instance: I) => Iterable<I>;

  items: (instance: I) => Iterable<I>;
};

/**
 * Describes which parts of a keyword's value are schemas.
 *
 * - `"schema"` matches an object or a boolean.
 * - `"unappliedSchema"` is a schema the keyword doesn't apply, like
 *   `contentSchema`. It's resolved like any schema, so identifiers in it
 *   work, and tools know it's a schema, but it isn't compiled.
 * - `"reference"` matches a string that's a URI reference. It's resolved
 *   against the base URI, and the value node has the result as `href`.
 *   It's how tools find references (`$ref`) without knowing keywords.
 * - `{ array: Shape }` matches an array whose items have the given shape.
 * - `{ map: Shape }` matches an object whose property values have the given
 *   shape.
 * - `"data"` matches anything. Nothing in it is a schema.
 * - An array of shapes uses the first alternative that matches the value's
 *   JSON type.
 *
 * The resolver reports a value that doesn't fit: one that isn't a schema
 * where `"schema"` is the whole shape (`invalid-schema`), a map or array of
 * the wrong type, or a value that matches no alternative. A `"data"`
 * alternative matches anything, so it leaves values that don't match the
 * other alternatives to the keyword's {@link Keyword.check}. Only use it for
 * values a shape can't describe, like `itemPattern`'s operators.
 *
 * | Keyword                    | Shape                                         |
 * | -------------------------- | --------------------------------------------- |
 * | `not`, `items` (2020-12)   | `"schema"`                                    |
 * | `contentSchema`            | `"unappliedSchema"`                           |
 * | `$ref`, `$recursiveRef`    | `"reference"`                                 |
 * | `allOf`, `prefixItems`     | `{ array: "schema" }`                         |
 * | `properties`, `$defs`      | `{ map: "schema" }`                           |
 * | `items` (draft-04)         | `["schema", { array: "schema" }]`             |
 * | `dependencies` (draft-04)  | `{ map: ["schema", { array: "data" }] }`      |
 * | `propertyDependencies`     | `{ map: { map: "schema" } }`                  |
 * | `conditional`              | `{ array: ["schema", { array: "schema" }] }`  |
 * | `const`, `enum`, `default` | `"data"`                                      |
 */
export type Shape = "schema" | "unappliedSchema" | "reference" | "data" | { array: Shape } | { map: Shape } | Shape[];

/**
 * The type of a keyword's value as it's written in a schema whose type is
 * `S`. It comes from the keyword's shape and the value `lower` gets: a schema
 * is an `S`, a reference is a string, a map is an object, and data is what
 * `lower` gets for it, readonly. A keyword whose shape isn't a literal type
 * can have any value.
 *
 * ```ts
 * KeywordValue<Keyword<[string, Expression][], { map: "schema" }>, S>
 * // { readonly [name: string]: S }
 * ```
 */
export type KeywordValue<K extends Keyword<any, any, any>, S> = K extends Keyword<infer V, infer Sh, any> ? ShapeValue<Sh, V, S> : never;

// Alternatives come before `map`, because arrays have a `map` method
type ShapeValue<Sh, V, S>
  = [Shape] extends [Sh] ? unknown
    : Sh extends readonly (infer A)[] ? AlternativeValue<A, A, V, S>
      : Sh extends { array: infer I } ? readonly ShapeValue<I, V extends readonly (infer E)[] ? E : never, S>[]
        : Sh extends { map: infer I } ? { readonly [name: string]: ShapeValue<I, V extends readonly [string, infer E][] ? E : never, S> }
          : LeafValue<Sh, V, S>;

type LeafValue<Sh, V, S>
  = Sh extends "schema" | "unappliedSchema" ? S
    : Sh extends "reference" ? string
      : Sh extends "data" ? DataValue<V>
        : never;

// An alternative only gets values of JSON types the others don't match, so
// a `"data"` alternative isn't an array if an array or map alternative is
type AlternativeValue<A, All, V, S>
  = A extends "data" ? ([Extract<All, { array: any } | { map: any }>] extends [never] ? DataValue<V> : DataValue<Exclude<V, readonly any[]>>)
    : ShapeValue<A, V, S>;

// The parts of `V` that aren't schemas or references
type DataValue<V> = unknown extends V ? Json : DeepReadonly<Exclude<V, Expression | Reference>>;

// `Json` is recursive, so it isn't expanded
type DeepReadonly<T>
  = Json extends T ? ReadonlyJson
    : T extends object ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
      : T;

export type CheckContext = {
  /**
   * The values of the siblings the keyword declares ({@link Keyword.siblings}),
   * by the names it gives them, such as `maximum` for draft-04's
   * `exclusiveMaximum`. A sibling that isn't in the schema is undefined. A
   * sibling's value may not be annotated yet.
   */
  siblings: Record<string, JsonSchemaTolerantNode | undefined>;

  /**
   * Report a problem with the keyword's value. It's added to the file's
   * messages with the keyword's URI as the `ruleId`. The node defaults to the
   * keyword's value.
   */
  message: (reason: string, node?: Node) => VFileMessage;
};

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
   * Make the schema a meta-schema that defines a dialect, like `$vocabulary`
   * does. The dialect is identified by any URI the schema resource is found
   * by. A dialect that's already defined isn't replaced. Keyword names can't
   * start with `x-`.
   *
   * It's only allowed where a schema resource starts. Anywhere else, it's
   * ignored with a message.
   */
  defineDialect: (dialect: DialectDefinition) => void;

  /**
   * Report a problem with the keyword, such as an invalid identifier. It's
   * added to the file's messages. The node defaults to the keyword's value.
   */
  message: (reason: string, node?: Node) => VFileMessage;
};
