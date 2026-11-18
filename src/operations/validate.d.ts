import type { JsonSchemaConfig } from "../json-schema.d.ts";
import type { JsonDocumentNode, JsonErrorNode, JsonNode, JsonParseStatus, ReadonlyJson } from "@hyperjump/browser";
import type { EvaluationPlugin } from "../kernel/evaluation-plugin.d.ts";
import type { OutputFormat } from "../output/output-format.d.ts";
import type { SessionOptions } from "../session.d.ts";
import type { CompiledSchema } from "./compile.d.ts";
import type { SchemaSource } from "./schema-source.d.ts";

/**
 * Validate an instance. It compiles the schema every time, so to validate
 * more than one instance, use {@link validator} once instead.
 *
 * @throws SchemaError if a schema has problems.
 * @throws An error from `@hyperjump/browser` if a schema can't be
 * retrieved. Its `cause.code` says why.
 */
export function validate<S, R = boolean, I extends Input = "value">(config: JsonSchemaConfig<S>, schema: NoInfer<SchemaSource<S>>, instance: InstanceOf<I>, options?: ValidationOptions<R, I>): Promise<R>;

/**
 * Compile a schema into a function that validates instances. The output
 * format, plugins, and input are chosen here, so the evaluator for them is
 * chosen once.
 *
 * @throws SchemaError if a schema has problems.
 * @throws An error from `@hyperjump/browser` if a schema can't be
 * retrieved. Its `cause.code` says why.
 */
export function validator<S, R = boolean, I extends Input = "value">(config: JsonSchemaConfig<S>, schema: NoInfer<SchemaSource<S>>, options?: ValidationOptions<R, I>): Promise<(instance: InstanceOf<I>) => R>;

/**
 * Validate an instance and annotate it: the result has the instance as a
 * JSON AST with the annotations attached to its nodes. Read them with
 * `annotation`. It compiles the schema every time, like
 * {@link validate}.
 */
export function annotate<S, R = boolean, I extends Input = "value">(config: JsonSchemaConfig<S>, schema: NoInfer<SchemaSource<S>>, instance: InstanceOf<I>, options?: ValidationOptions<R, I>): Promise<AnnotationResult<R>>;

/** Compile a schema into a function that annotates instances, like {@link validator} */
export function annotator<S, R = boolean, I extends Input = "value">(config: JsonSchemaConfig<S>, schema: NoInfer<SchemaSource<S>>, options?: ValidationOptions<R, I>): Promise<(instance: InstanceOf<I>) => AnnotationResult<R>>;

/**
 * What an instance is:
 *
 * - `value`: a JavaScript value. It's the default and the fastest, and
 *   validating it never builds an AST. Evaluating only reads it.
 * - `json`: JSON text. Any syntax error makes the instance invalid, even one
 *   the parser could recover from, like a trailing comma, but the instance
 *   is still evaluated as far as it could be parsed, so all the problems are
 *   reported at once. Errors have positions.
 * - `node`: a JSON AST you already have, like a value in a schema AST, or
 *   a document, like the one `fromJson` or `rejsonParse` makes, whose root
 *   is evaluated. Errors have the nodes' positions. A document's syntax
 *   errors aren't errors of the instance, because they're reported where
 *   it's parsed. Annotating it attaches the annotations to the node you
 *   pass, or the document's root, so annotating it again adds to them.
 *
 * Values that couldn't be parsed (`json-missing` and `json-invalid` nodes)
 * aren't evaluated, so the syntax error is the only error for them. A JSON
 * string is also a valid value, which is why the input is an option.
 */
export type Input = "value" | "json" | "node";

/** The type of an instance for an {@link Input} */
export type InstanceOf<I extends Input> = I extends "json" ? string
  : I extends "node" ? JsonNode<unknown, JsonErrorNode> | JsonErrorNode | JsonDocumentNode
    : ReadonlyJson;

export type EvaluationOptions<R = boolean, I extends Input = Input> = {
  /** What the instance is. It's `value` by default. */
  input?: I;

  /** The output format, like `BASIC`. It's `FLAG` by default. */
  output?: OutputFormat<R>;

  /**
   * Plugins to run during each evaluation. With any plugin, the instance is
   * evaluated once and nothing stops early, which is slower.
   */
  plugins?: EvaluationPlugin[];
};

export type ValidationOptions<R = boolean, I extends Input = Input> = SessionOptions & EvaluationOptions<R, I>;

/**
 * The validation output is a separate property because the FLAG output is a
 * boolean and can't be combined with the other properties.
 */
export type AnnotationResult<R> = {
  output: R;

  /** Always `"success"` for a value or a node */
  status: JsonParseStatus;

  /**
   * The annotated instance. It's a {@link JsonErrorNode} if the text was so
   * malformed that it has no value at all.
   */
  node: JsonNode<{ type: "json" }, JsonErrorNode> | JsonErrorNode;
};
