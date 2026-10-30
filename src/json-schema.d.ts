import type { Hyperjump, HyperjumpConfig } from "@hyperjump/browser";
import type {
  Json,
  JsonErrorNode,
  JsonNode,
  JsonParseStatus,
  ReadonlyJson
} from "@hyperjump/browser/json";
import type { JsonSchemaNode } from "./schema/schema-ast.d.ts";
import type { Keyword } from "./keyword.d.ts";
import type { Dialect, DialectConfig, DialectExtension, Vocabulary, VocabularyConfig } from "./dialect.d.ts";
import type { Format } from "./format.d.ts";
import type { EvaluationPlugin } from "./kernel/evaluation-plugin.d.ts";
import type { SchemaRegistry } from "./registry/schema-registry.d.ts";
import type { BundleOptions, JsonSchemaSession, LintOptions, SessionOptions } from "./session.d.ts";
import type { SchemaMessage } from "./schema/schema-error.d.ts";
import type { OutputFormat, OutputFormatDefinition, ValidationResult } from "./output/output-format.d.ts";

export { outputErrorMessage, toVFileMessage } from "./output/validation-error.js";
export { SchemaError } from "./schema/schema-error.js";
export { RetrievalNotAllowedError } from "@hyperjump/browser";
export type { ValidationError, DetailedValidationError } from "./output/validation-error.js";
export type { SchemaMessage } from "./schema/schema-error.js";
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
   * The dialects schemas can use, like `v1Dialect`, with the keywords and
   * formats they bring. Other dialects can still be defined by meta-schemas
   * (`$vocabulary`), and a session builds those the first time they're
   * used. A dialect can't be in the list twice. They can't change after the
   * `JsonSchema` is created.
   */
  dialects?: DialectConfig[];

  /**
   * Keywords that replace a dialect's definition with the same URI, or that
   * a dialect names by URI
   */
  keywords?: Keyword<any, any, any>[];

  /**
   * Formats that replace a dialect's definition with the same URI, or that
   * a dialect names by URI, like `fullFormats`
   */
  formats?: Format[];

  /**
   * More vocabularies `$vocabulary` can use, by URI, in addition to the ones
   * the dialects bring. One here replaces a dialect's.
   */
  vocabularies?: Record<string, VocabularyConfig>;
};

/**
 * A dialect with more keywords or formats, such as a custom keyword in the
 * v1 dialect. Pass it in the config instead of the dialect.
 *
 * @throws Error if the dialect already has a keyword or format with one of
 * the names, or a keyword name starts with `x-`
 */
export function extendDialect(dialect: DialectConfig, extension: DialectExtension): DialectConfig;

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
   * Schemas every session sees, like custom meta-schemas, after the
   * session's own `registry`. It starts empty. Change it by replacing it
   * with a new registry (`with`, `without`, `concat`). A session sees the
   * registry this was when the session was created.
   */
  registry: SchemaRegistry<any>;

  /** Whether there's a keyword definition with this URI */
  hasKeyword(uri: string): boolean;

  /**
   * Get a keyword definition.
   *
   * @throws Error if the keyword hasn't been added.
   */
  getKeyword(uri: string): Keyword;

  /** Whether there's a format definition with this URI */
  hasFormat(uri: string): boolean;

  /**
   * Get a format definition.
   *
   * @throws Error if the format hasn't been added.
   */
  getFormat(uri: string): Format;

  /**
   * Whether a dialect is in the config. A dialect a session built from its
   * meta-schema isn't.
   */
  hasDialect(uri: string): boolean;

  /**
   * Get a dialect from the config, with its definitions named by URI.
   *
   * @throws Error if the dialect isn't in the config.
   */
  getDialect(uri: string): Dialect;

  /**
   * A vocabulary `$vocabulary` can use, from the config or a dialect, with
   * its definitions named by URI
   */
  getVocabulary(uri: string): Vocabulary | undefined;

  /**
   * Compile a schema into a {@link Validator} that can be used for any
   * number of instances, in a new session.
   *
   * @throws SchemaError if a schema has problems. It has every problem in
   * the first document found to have any.
   * @throws RetrievalError from `@hyperjump/browser` if a schema can't be
   * retrieved.
   */
  compile(uri: string, options?: SessionOptions): Promise<Validator>;

  /**
   * Bundle a schema and every schema it references into one schema, in a
   * new session. See {@link JsonSchemaSession.bundle}. The session's
   * registries and `allowRetrieval` decide what can be bundled.
   */
  bundle(uri: string, options?: SessionOptions & BundleOptions): Promise<Json>;

  /**
   * Lint a schema document, in a new session. See
   * {@link JsonSchemaSession.lint}. The session's registries and
   * `allowRetrieval` decide what rules can see in other documents.
   */
  lint(uri: string, options?: SessionOptions & LintOptions): Promise<SchemaMessage[]>;

  /**
   * Restore a validator from {@link Validator.serialize}. It doesn't
   * retrieve anything, but it needs the same keywords to have been added.
   *
   * A schema in a file is serialized with its `file:` URIs relative to it.
   * `uri` is where it is now, like `pathToFileURL("schemas/person.json")`,
   * which they're resolved against, so its locations in output and plugins
   * are its files. Without it, they stay relative.
   *
   * @throws Error if the compiled schema is in a kernel version other than
   * this library's (`kernel: 1`), or if a keyword or asserting format in it
   * hasn't been added.
   */
  restoreValidator(compiled: ReadonlyJson, options?: RestoreOptions): Validator;

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
  validate<F extends OutputFormat = "FLAG">(uri: string, instance: ReadonlyJson, options?: ValidationOptions<F>): Promise<ValidationResult<F>>;

  /** A shortcut for `(await compile(uri)).validateJson(json, options)` */
  validateJson<F extends OutputFormat = "FLAG">(uri: string, json: string, options?: ValidationOptions<F>): Promise<ValidationResult<F>>;

  /** A shortcut for `(await compile(uri)).annotate(instance, options)` */
  annotate<F extends OutputFormat = "FLAG">(uri: string, instance: ReadonlyJson, options?: ValidationOptions<F>): Promise<AnnotationResult<F>>;

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

  validate<F extends OutputFormat = "FLAG">(instance: ReadonlyJson, options?: ValidationOptions<F>): ValidationResult<F>;

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

  annotate<F extends OutputFormat = "FLAG">(instance: ReadonlyJson, options?: ValidationOptions<F>): AnnotationResult<F>;

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
   * {@link JsonSchema.restoreValidator} without compiling again. For a
   * schema in a file, its `file:` URIs are relative to it: `#/properties/a`
   * in its own document and `common/address.json#/type` in another. So it
   * doesn't say where the files are, and it can be restored on another
   * machine. Other URIs are absolute.
   */
  serialize(): Json;
};

export type RestoreOptions = {
  /**
   * Where the schema that was serialized is now, to resolve its relative
   * `file:` URIs against
   */
  uri?: string;
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
