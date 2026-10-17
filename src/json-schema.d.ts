import type { Position } from "unist";
import type { VFileMessage } from "vfile-message";
import type { Hyperjump, HyperjumpConfig } from "@hyperjump/browser";
import type {
  Json,
  JsonErrorNode,
  JsonNode,
  JsonParseStatus,
  JsonSyntaxErrorCode
} from "@hyperjump/browser/json";
import type { JsonSchemaNode } from "./schema-ast.d.ts";
import type { Keyword } from "./keyword.d.ts";
import type { Dialect, Vocabulary } from "./dialect.d.ts";
import type { EvaluationPlugin } from "./evaluation-plugin.d.ts";

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

  // TODO: A registry for schemas that aren't retrieved from a URI

  /** Add or replace a keyword definition */
  addKeyword: (keyword: Keyword) => void;

  /**
   * Get a keyword definition.
   *
   * @throws Error if the keyword hasn't been added.
   */
  getKeyword: (uri: string) => Keyword;

  /**
   * Add or replace a vocabulary.
   *
   * @throws Error if a keyword name starts with `x-`
   */
  addVocabulary: (vocabulary: Vocabulary) => void;

  /**
   * Add a dialect. Most dialects don't need to be added. They're built from
   * their meta-schema's `$vocabulary` the first time they're used. Add one
   * only for a dialect whose meta-schema doesn't have `$vocabulary`, such as
   * draft-04 through draft-07.
   *
   * @throws Error if the dialect is already defined (use {@link removeDialect}
   * first to replace it) or a keyword name starts with `x-`.
   */
  addDialect: (dialect: Dialect) => void;

  /**
   * Add keywords to a dialect that's defined, such as a custom keyword in the
   * v1 dialect. Schemas that were already resolved aren't affected.
   *
   * @throws Error if the dialect isn't defined, it already has a keyword with
   * one of the names, or a keyword name starts with `x-`.
   */
  extendDialect: (uri: string, keywords: Record<string, string>) => void;

  /**
   * Build a dialect from a `$vocabulary` value and add it. Vocabularies whose
   * value is `false` are optional and are skipped if they haven't been added.
   * Unknown keywords are annotations, as they are in 2019-09 and 2020-12.
   *
   * @throws Error if a required vocabulary hasn't been added or the dialect is
   * already defined.
   */
  addDialectFromVocabularies: (uri: string, vocabularies: Record<string, boolean>) => Dialect;

  /** Whether a dialect is defined. A dialect that hasn't been used yet isn't. */
  hasDialect: (uri: string) => boolean;

  /** Remove a dialect so it can be replaced. */
  removeDialect: (uri: string) => void;

  /**
   * Get a dialect. If it isn't defined, its meta-schema is retrieved with
   * {@link get} and the dialect is built from the meta-schema's `$vocabulary`.
   * The meta-schema must be retrieved as a schema (`application/schema+json`
   * or a `.schema.json` file). A JSON document isn't used even if it has a
   * `$vocabulary`.
   *
   * @throws Error if the meta-schema can't be retrieved, isn't a schema,
   * doesn't have `$vocabulary`, requires a vocabulary that hasn't been added,
   * or depends on a meta-schema that depends on it.
   */
  getDialect: (uri: string, options?: GetDialectOptions) => Promise<Dialect>;

  /**
   * Compile a schema into a {@link Validator} that can be used for any
   * number of instances.
   *
   * @throws {@link InvalidSchemaError}
   * @throws RetrievalError from `@hyperjump/browser`
   */
  compile: (uri: string) => Promise<Validator>;

  /**
   * Restore a validator from {@link Validator.serialize}. It doesn't
   * retrieve anything, but it needs the same keywords to have been added.
   *
   * @throws Error if a keyword in the compiled schema hasn't been added.
   */
  restoreValidator: (compiled: Json) => Validator;

  /**
   * Add an output format. BASIC and DETAILED are added by default and can be
   * replaced.
   *
   * @throws Error for FLAG, which is built in.
   */
  addOutputFormat: <F extends OutputFormat>(name: F, definition: OutputFormatDefinition<F>) => void;

  /**
   * Get an output format's definition.
   *
   * @throws Error if the output format hasn't been added. FLAG doesn't have
   * a definition.
   */
  getOutputFormat: <F extends OutputFormat>(name: F) => OutputFormatDefinition<F>;

  /** A shortcut for `(await compile(uri)).validate(instance, options)` */
  validate: <F extends OutputFormat = "FLAG">(uri: string, instance: Json, options?: ValidationOptions<F>) => Promise<ValidationResult<F>>;

  /** A shortcut for `(await compile(uri)).validateJson(json, options)` */
  validateJson: <F extends OutputFormat = "FLAG">(uri: string, json: string, options?: ValidationOptions<F>) => Promise<ValidationResult<F>>;

  /** A shortcut for `(await compile(uri)).annotate(instance, options)` */
  annotate: <F extends OutputFormat = "FLAG">(uri: string, instance: Json, options?: ValidationOptions<F>) => Promise<AnnotationResult<F>>;

  /** A shortcut for `(await compile(uri)).annotateJson(json, options)` */
  annotateJson: <F extends OutputFormat = "FLAG">(uri: string, json: string, options?: ValidationOptions<F>) => Promise<AnnotationResult<F>>;
}

export type GetDialectOptions = {
  /**
   * The URI of the document that needs the dialect. When that document is a
   * meta-schema that's being retrieved to build a dialect, this is used to
   * detect meta-schemas that depend on each other, which would otherwise
   * wait for each other forever.
   */
  referencedFrom?: string;
};

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
 * and every error has a position.
 */
export type Validator = {
  /** The URI of the compiled schema */
  uri: string;

  validate: <F extends OutputFormat = "FLAG">(instance: Json, options?: ValidationOptions<F>) => ValidationResult<F>;

  /**
   * Parse and validate JSON text. Any syntax error makes the instance
   * invalid, even one the parser could recover from like a trailing comma,
   * but the instance is still validated as far as it could be parsed so all
   * the problems are reported at once.
   */
  validateJson: <F extends OutputFormat = "FLAG">(json: string, options?: ValidationOptions<F>) => ValidationResult<F>;

  annotate: <F extends OutputFormat = "FLAG">(instance: Json, options?: ValidationOptions<F>) => AnnotationResult<F>;

  /**
   * Parse, validate, and annotate JSON text. The parse is error-tolerant, so
   * you get an AST even if the text has syntax errors. Values that couldn't
   * be parsed are {@link JsonErrorNode}s. Keywords don't evaluate those
   * nodes, so the syntax error is the only error reported for them.
   */
  annotateJson: <F extends OutputFormat = "FLAG">(json: string, options?: ValidationOptions<F>) => AnnotationResult<F>;

  /**
   * The compiled schema as JSON, to be restored with
   * {@link JsonSchema.restoreValidator} without compiling again.
   */
  serialize: () => Json;
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
 * How an output format is produced. It's called for each evaluation that
 * uses the format.
 *
 * Evaluation without plugins is fastest, so an instance is evaluated without
 * the format's plugin first unless other plugins are used. The plugin only
 * runs if the instance is invalid. So `output(true)` can be called without
 * the plugin having seen anything.
 */
export type OutputFormatDefinition<F extends OutputFormat> = () => {
  plugin?: EvaluationPlugin;

  /**
   * @param valid - False if there are syntax errors, even if the instance
   * passed the schema
   * @param syntaxErrors - Errors from parsing JSON text. It's empty for an
   * instance that wasn't parsed.
   */
  output: (valid: boolean, syntaxErrors: JsonSyntaxError[]) => ValidationResult<F>;
};

/**
 * The output format determines what's included in `errors`. To add an output
 * format, augment this interface and add its implementation with
 * {@link JsonSchema.addOutputFormat}.
 *
 * ```ts
 * declare module "@hyperjump/json-schema" {
 *   interface OutputFormats {
 *     MY_FORMAT: { valid: boolean; errors: MyError[] };
 *   }
 * }
 * ```
 *
 * The built-in formats give errors a generic `reason` that names the keyword.
 * Messages that explain the error are left to other output formats, such as
 * `@hyperjump/json-schema-errors`.
 */
// TODO: Support the output format being developed for the next spec release
export interface OutputFormats {
  /**
   * Only whether the instance is valid. It's a plain boolean rather than an
   * object so the fastest path doesn't allocate anything.
   */
  FLAG: boolean;

  /**
   * A flat list of every error. A keyword whose failure is fully explained
   * by its subschemas' failures ({@link Keyword.simpleApplicator}) doesn't get
   * an error of its own.
   */
  BASIC: { valid: boolean; errors: OutputError[] };

  /**
   * Errors nested by schema structure. Applicators that fail because a
   * subschema failed contain those failures in `errors`.
   */
  DETAILED: { valid: boolean; errors: OutputError<DetailedValidationError>[] };
}

export type OutputFormat = keyof OutputFormats;

export type ValidationResult<F extends OutputFormat> = OutputFormats[F];

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

/**
 * Errors are in document order. Syntax errors only occur with JSON text.
 */
export type OutputError<V extends ValidationError = ValidationError> = V | JsonSyntaxError;

/**
 * A syntax error from parsing JSON text. These come from the parser in
 * `@hyperjump/browser`.
 */
export type JsonSyntaxError = VFileMessage & {
  source: "json";
  ruleId: JsonSyntaxErrorCode;
};

/**
 * An instance location failed a keyword. This is a VFileMessage so it can be
 * used with unified tooling. `place` is set when the instance came from JSON
 * text.
 */
export class ValidationError extends VFileMessage {
  source: "json-schema";

  /** The URI of the keyword that failed */
  ruleId: string;

  /** A JSON Pointer to the keyword relative to the schema evaluation started from, following references. */
  keywordLocation: string;

  /** The URI of the keyword in the schema it's defined in */
  absoluteKeywordLocation: string;

  /** A JSON Pointer to the value in the instance that failed */
  instanceLocation: string;

  constructor(reason: string, options: ValidationErrorOptions);
}

export type ValidationErrorOptions = {
  ruleId: string;
  keywordLocation: string;
  absoluteKeywordLocation: string;
  instanceLocation: string;

  /** Where the instance is in the JSON text it came from */
  place?: Position;
};

export class DetailedValidationError extends ValidationError {
  /** The subschema failures that caused this keyword to fail */
  errors?: DetailedValidationError[];
}

/**
 * Thrown when compiling a schema that isn't valid according to its
 * meta-schema.
 */
export class InvalidSchemaError extends Error {
  /** Errors are positioned in the schema document if it was parsed from text. */
  errors: OutputError[];

  constructor(errors: OutputError[]);
}

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
