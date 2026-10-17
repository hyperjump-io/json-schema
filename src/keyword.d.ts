import type { Node } from "unist";
import type { VFileMessage } from "vfile-message";
import type { Json, JsonErrorNode, JsonNode, JsonType } from "@hyperjump/browser/json";
import type { JsonSchemaNode } from "./schema-ast.d.ts";
import type { Dialect } from "./dialect.d.ts";
import type { JsonSchema } from "./json-schema.d.ts";

/**
 * The definition of a keyword. A dialect maps keyword names to these by URI.
 *
 * Keywords are stateless so one definition can be shared by every
 * `JsonSchema` instance and every dialect. Evaluating a keyword has two
 * steps. `compile` turns the keyword's value into data once per
 * schema. `evaluate` turns that data into a function each time a
 * validator is specialized for a kind of instance and output.
 *
 * `C` is the type of the compiled value.
 */
export type Keyword<C extends Json = Json> = {
  /**
   * Identifies the keyword independent of its name in any dialect. Use a
   * domain you control to avoid conflicts.
   */
  uri: string;

  /** Where the keyword's value contains schemas */
  shape: Shape;

  /**
   * A schema for the keyword's value, used to validate schemas. It doesn't
   * need to describe the subschemas in the value. They're validated as
   * schemas in their own right. Without a value schema, any value is valid.
   */
  // TODO: Evaluate value schemas once compiling and evaluating are implemented
  valueSchema?: Json;

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
   * Turn the keyword's value into data the keyword can be evaluated with.
   * This is where subschemas are compiled and references are retrieved. The
   * result must be JSON so a compiled schema can be serialized. Without it,
   * the compiled value is the keyword's value.
   */
  compile?(valueNode: JsonSchemaNode, context: CompileContext): C | Promise<C>;

  /**
   * Build the function that evaluates the keyword. It's called once for
   * each specialization of a validator, not for each instance, so do any
   * work that doesn't depend on the instance here.
   *
   * The evaluator returns whether the instance is valid. Without
   * `evaluate`, the keyword has no effect on evaluation, like `$id`.
   */
  evaluate?<I>(compiled: C, context: EvaluateContext<I>): Evaluator<I>;

  /**
   * Evaluation state the keyword reads. The core only tracks a kind of
   * state if a keyword in the compiled schema reads it, so schemas that
   * don't use these keywords don't pay for them.
   *
   * - `evaluated`: The properties or items evaluated so far at the same
   *   instance location (`unevaluatedProperties`, `unevaluatedItems`). The
   *   keyword is evaluated after its siblings that don't read it.
   * - `dynamicScope`: The dynamic anchors in the dynamic scope
   *   (`$dynamicRef`, `$recursiveRef`).
   */
  reads?: EvaluationState[];

  /**
   * Whether the keyword fails only when a subschema fails and its failure is
   * fully explained by theirs, like `properties`, `allOf`, and `$ref`. The
   * BASIC output format reports only the subschemas' errors for these. A
   * failing `oneOf` isn't explained by its subschemas, so it isn't one.
   */
  simpleApplicator?: boolean;
};

export type EvaluationState = "evaluated" | "dynamicScope";

/** Whether an instance passes a keyword or a schema */
export type Evaluator<I> = (instance: I) => boolean;

/**
 * Identifies a compiled schema. It's the schema's canonical URI.
 */
export type SchemaHandle = string;

export type CompileContext = {
  /** The instance compiling the schema */
  jsonSchema: JsonSchema;

  /**
   * The schema the keyword is in. Use it to find sibling keywords, such as
   * `properties` for `additionalProperties`.
   */
  schemaNode: JsonSchemaNode;

  /** The dialect of the schema the keyword is in */
  dialect: Dialect;

  /**
   * The keyword's name in the schema. Unknown keywords share one definition
   * and use this to tell themselves apart.
   */
  keywordName: string;

  /**
   * Compile a subschema, or the schema a URI identifies, which is retrieved
   * if necessary. A schema is only compiled once, so schemas that refer to
   * each other are fine.
   */
  compileSchema: (schema: JsonSchemaNode | string) => Promise<SchemaHandle>;
};

/**
 * `I` is the kind of instance the validator is specialized for. It's `Json`
 * for `validate` and a JSON AST node for the other methods. Keywords don't
 * need to know which. They use `instance` to look at it.
 */
export type EvaluateContext<I> = {
  instance: InstanceOps<I>;

  /**
   * Get the evaluator for a compiled schema. Pass `segment` when evaluating
   * a property or item of the instance (`properties`, `items`) so errors and
   * annotations get the right instance location. Leave it out when
   * evaluating the same instance (`allOf`, `$ref`).
   */
  schema: (handle: SchemaHandle) => (instance: I, segment?: string | number) => boolean;

  /**
   * Add an annotation for the instance. It's kept only if the keyword and
   * every schema it was evaluated through pass. It's undefined unless
   * annotations are being collected, so a keyword can skip work it only does
   * to annotate.
   */
  annotate?: (value: Json) => void;

  /**
   * Whether every subschema needs to be evaluated, because errors or
   * annotations are being collected. When it's false, a keyword can stop as
   * soon as its result is known.
   */
  exhaustive: boolean;

  /**
   * Record that the keyword evaluated a property (by name) or an item (by
   * index) of the instance. Applicators that evaluate properties or items
   * call it after evaluating the subschema. Like annotations, marks are kept
   * only if the keyword and every schema it was evaluated through pass.
   *
   * It's undefined unless a keyword in the compiled schema reads
   * `evaluated`. While it's defined, a keyword must not stop at a passing
   * subschema (`anyOf`, `contains`), because the subschemas it skips would
   * have marked properties or items too. Stopping at a failure is fine.
   */
  markEvaluated?: (key: string | number) => void;

  /**
   * The properties or items marked so far at this instance location. Only
   * defined for keywords that read `evaluated`.
   */
  evaluated?: () => ReadonlySet<string | number>;

  /**
   * The evaluator for the outermost schema in the dynamic scope with the
   * given dynamic anchor. Only defined for keywords that read
   * `dynamicScope`. Rules about the anchor the reference starts from, such
   * as 2020-12's bookending or 2019-09's `$recursiveAnchor`, are up to the
   * keyword.
   */
  dynamicAnchor?: (name: string) => Evaluator<I> | undefined;
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

  /** The instance as a JS value. This is a copy for an array or object node. */
  value: (instance: I) => Json;

  /** The number of items in an array or properties in an object */
  length: (instance: I) => number;

  /** Whether an object has a property, even one whose value is missing */
  has: (instance: I, name: string) => boolean;

  /** A property of an object or an item of an array */
  get: (instance: I, key: string | number) => I | undefined;

  entries: (instance: I) => Iterable<[string, I]>;

  items: (instance: I) => Iterable<I>;
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
