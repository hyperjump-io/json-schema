import type { Hyperjump, HyperjumpConfig } from "@hyperjump/browser";
import type {
  Json,
  JsonErrorNode,
  JsonNode,
  JsonParseStatus
} from "@hyperjump/browser/json";
import type { JsonSchemaNode } from "./schema/schema-ast.d.ts";
import type { Keyword } from "./keyword.d.ts";
import type { Dialect, DialectExtension } from "./dialect.d.ts";
import type { Format } from "./format.d.ts";
import type { EvaluationPlugin } from "./evaluate/evaluation-plugin.d.ts";
import type { SchemaRegistry } from "./registry/schema-registry.d.ts";
import type { JsonSchemaSession, SessionOptions } from "./session.d.ts";
import type { OutputFormat, OutputFormatDefinition, ValidationResult } from "./output/output-format.d.ts";

export { ValidationError, DetailedValidationError, InvalidSchemaError } from "./output/validation-error.js";
export type { ValidationErrorOptions } from "./output/validation-error.js";
export type { OutputError, OutputFormat, OutputFormatDefinition, OutputFormats, JsonSyntaxError, ValidationResult } from "./output/output-format.d.ts";

export type JsonSchemaConfig = HyperjumpConfig & {
  /**
   * The dialect of a schema that doesn't have `$schema` and doesn't get a
   * dialect from anywhere else, such as a `Content-Type` parameter or the
   * resource it's embedded in. There is no default. Without one, such a
   * schema is an error.
   */
  defaultDialectUri?: string;

  /**
   * Validate `format`. Defaults to whatever the dialect says. `format` is an
   * annotation in most dialects.
   */
  validateFormats?: boolean;

  /**
   * Validate schemas against their meta-schema before using them. Defaults to
   * `true`.
   */
  validateSchemas?: boolean;
};

export class JsonSchema extends Hyperjump<JsonSchemaNode> {
  constructor(config?: JsonSchemaConfig);

  readonly config: JsonSchemaConfig;

  /**
   * Start a session for retrieving and compiling schemas. Dialects built
   * from meta-schemas belong to the session, like the documents it
   * retrieves.
   */
  session(options?: SessionOptions): JsonSchemaSession;

  /**
   * Add a registry that every new session sees. Its schemas are identified
   * the first time a session needs them.
   *
   * @throws Error if the registry was already added
   */
  addRegistry(registry: SchemaRegistry): void;

  /** Sessions that already exist still see the registry. */
  removeRegistry(registry: SchemaRegistry): void;

  /** Add or replace a keyword definition */
  addKeyword(keyword: Keyword): void;

  /** Whether a keyword definition has been added */
  hasKeyword(uri: string): boolean;

  /**
   * Get a keyword definition.
   *
   * @throws Error if the keyword hasn't been added.
   */
  getKeyword(uri: string): Keyword;

  /** Add or replace a format definition */
  addFormat(format: Format): void;

  /**
   * Get a format definition.
   *
   * @throws Error if the format hasn't been added.
   */
  getFormat(uri: string): Format;

  /**
   * Add a dialect. Most dialects don't need to be added. A meta-schema can
   * define one, as `$vocabulary` does, and it's found the first time it's
   * used. Add one for a dialect whose meta-schema doesn't define it, such as
   * draft-04 through draft-07, or one whose meta-schema describes itself.
   *
   * @throws Error if the dialect is already defined (use {@link removeDialect}
   * first to replace it) or a keyword name starts with `x-`.
   */
  addDialect(dialect: Dialect): void;

  /**
   * Add keywords or formats to a dialect that's defined, such as a custom
   * keyword in the v1 dialect. Schemas that were already resolved aren't
   * affected.
   *
   * @throws Error if the dialect isn't defined, it already has a keyword or
   * format with one of the names, or a keyword name starts with `x-`.
   */
  extendDialect(uri: string, extension: DialectExtension): void;

  /**
   * Whether a dialect has been added. A dialect a session built from its
   * meta-schema isn't.
   */
  hasDialect(uri: string): boolean;

  /** Remove a dialect so it can be replaced. */
  removeDialect(uri: string): void;

  /**
   * Get a dialect that has been added.
   *
   * @throws Error if the dialect hasn't been added.
   */
  getDialect(uri: string): Dialect;

  /**
   * Compile a schema into a {@link Validator} that can be used for any
   * number of instances, in a new session.
   *
   * @throws RetrievalError from `@hyperjump/browser` if a schema can't be
   * retrieved or isn't valid. For an invalid schema, the `cause` is the
   * problem, as a `VFileMessage`.
   */
  compile(uri: string, options?: SessionOptions): Promise<Validator>;

  /**
   * Restore a validator from {@link Validator.serialize}. It doesn't
   * retrieve anything, but it needs the same keywords to have been added.
   *
   * @throws Error if a keyword in the compiled schema hasn't been added.
   */
  restoreValidator(compiled: Json): Validator;

  /**
   * Add an output format. BASIC and DETAILED are added by default and can be
   * replaced.
   *
   * @throws Error for FLAG, which is built in.
   */
  addOutputFormat<F extends OutputFormat>(name: F, definition: OutputFormatDefinition<F>): void;

  /**
   * Get an output format's definition.
   *
   * @throws Error if the output format hasn't been added. FLAG doesn't have
   * a definition.
   */
  getOutputFormat<F extends OutputFormat>(name: F): OutputFormatDefinition<F>;

  /** A shortcut for `(await compile(uri)).validate(instance, options)` */
  validate<F extends OutputFormat = "FLAG">(uri: string, instance: Json, options?: ValidationOptions<F>): Promise<ValidationResult<F>>;

  /** A shortcut for `(await compile(uri)).validateJson(json, options)` */
  validateJson<F extends OutputFormat = "FLAG">(uri: string, json: string, options?: ValidationOptions<F>): Promise<ValidationResult<F>>;

  /** A shortcut for `(await compile(uri)).annotate(instance, options)` */
  annotate<F extends OutputFormat = "FLAG">(uri: string, instance: Json, options?: ValidationOptions<F>): Promise<AnnotationResult<F>>;

  /** A shortcut for `(await compile(uri)).annotateJson(json, options)` */
  annotateJson<F extends OutputFormat = "FLAG">(uri: string, json: string, options?: ValidationOptions<F>): Promise<AnnotationResult<F>>;
}

/**
 * A compiled schema. There are two ways to use it:
 *
 * - `validate` only tells you whether an instance is valid and why not. It
 *   never builds an AST.
 * - `annotate` validates and also returns the instance as an AST with
 *   annotations attached to its nodes.
 *
 * Each has a `Json` variant that takes JSON text instead of a value. A JSON
 * string is also a valid instance, so the two can't share a function. With
 * text, syntax errors are reported in `errors` along with validation errors,
 * and every error has a position. Each also has a `Node` variant that takes a
 * JSON AST you already have.
 */
export type Validator = {
  /** The URI of the compiled schema */
  uri: string;

  validate<F extends OutputFormat = "FLAG">(instance: Json, options?: ValidationOptions<F>): ValidationResult<F>;

  /**
   * Parse and validate JSON text. Any syntax error makes the instance
   * invalid, even one the parser could recover from like a trailing comma,
   * but the instance is still validated as far as it could be parsed so all
   * the problems are reported at once.
   */
  validateJson<F extends OutputFormat = "FLAG">(json: string, options?: ValidationOptions<F>): ValidationResult<F>;

  /**
   * Validate a JSON AST, such as a value in a schema AST. Errors have the
   * nodes' positions. Values that couldn't be parsed (`json-missing` and
   * `json-invalid` nodes) aren't evaluated.
   */
  validateNode<F extends OutputFormat = "FLAG">(node: JsonNode<unknown, JsonErrorNode> | JsonErrorNode, options?: ValidationOptions<F>): ValidationResult<F>;

  annotate<F extends OutputFormat = "FLAG">(instance: Json, options?: ValidationOptions<F>): AnnotationResult<F>;

  /**
   * Parse, validate, and annotate JSON text. The parse is error-tolerant, so
   * you get an AST even if the text has syntax errors. Values that couldn't
   * be parsed are {@link JsonErrorNode}s. Keywords don't evaluate those
   * nodes, so the syntax error is the only error reported for them.
   */
  annotateJson<F extends OutputFormat = "FLAG">(json: string, options?: ValidationOptions<F>): AnnotationResult<F>;

  /**
   * Validate and annotate a JSON AST, such as a value in a schema AST. The
   * annotations are attached to the node you pass, so annotating the same
   * node again adds to them. Values that couldn't be parsed (`json-missing`
   * and `json-invalid` nodes) aren't evaluated.
   */
  annotateNode<F extends OutputFormat = "FLAG">(node: JsonNode<unknown, JsonErrorNode> | JsonErrorNode, options?: ValidationOptions<F>): ValidationResult<F>;

  /**
   * The compiled schema as JSON, to be restored with
   * {@link JsonSchema.restoreValidator} without compiling again.
   */
  serialize(): Json;
};

export type ValidationOptions<F extends OutputFormat = OutputFormat> = {
  output?: F;

  /**
   * Plugins to run during this evaluation. With any plugin, the instance is
   * evaluated once and nothing stops early, which is slower.
   */
  plugins?: EvaluationPlugin[];
};

/**
 * The validation output is a separate property because the FLAG output is a
 * boolean and can't be combined with the other properties.
 */
export type AnnotationResult<F extends OutputFormat> = {
  output: ValidationResult<F>;

  /** Always `"success"` for `annotate`. */
  status: JsonParseStatus;

  /**
   * The annotated instance. It's a {@link JsonErrorNode} if the text was so
   * malformed that it has no value at all.
   */
  node: JsonNode<{ type: "json" }, JsonErrorNode> | JsonErrorNode;
};

declare module "unist" {
  interface Data {
    /**
     * Annotations collected for this instance location, by annotation keyword
     * URI. Each keyword has a value for every schema location where it applied
     * successfully.
     */
    annotations?: Map<string, Json[]>;
  }
}
