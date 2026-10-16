import type { VFileMessage } from "vfile-message";
import type { Hyperjump, HyperjumpConfig } from "@hyperjump/browser";
import type {
  Json,
  JsonErrorNode,
  JsonNode,
  JsonParseStatus,
  JsonSyntaxErrorCode
} from "@hyperjump/browser/json";

// TODO: Move to the schema AST module once it's designed
export type JsonSchemaNode = JsonNode<{
  type: "json";
} | {
  type: "json-schema";
  dialectUri: string;
}>;

export type JsonSchemaConfig = HyperjumpConfig & {
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

  // TODO: A registry for schemas that aren't retrieved from a URI

  /**
   * Compile a schema into a {@link Validator} that can be used for any
   * number of instances.
   *
   * @throws {@link InvalidSchemaError}
   * @throws RetrievalError from `@hyperjump/browser`
   */
  compile: (uri: string) => Promise<Validator>;

  /** A shortcut for `(await compile(uri)).validate(instance, options)` */
  validate: <F extends OutputFormat = "FLAG">(uri: string, instance: Json, options?: ValidationOptions<F>) => Promise<ValidationResult<F>>;

  /** A shortcut for `(await compile(uri)).validateJson(json, options)` */
  validateJson: <F extends OutputFormat = "FLAG">(uri: string, json: string, options?: ValidationOptions<F>) => Promise<ValidationResult<F>>;

  /** A shortcut for `(await compile(uri)).annotate(instance, options)` */
  annotate: <F extends OutputFormat = "FLAG">(uri: string, instance: Json, options?: ValidationOptions<F>) => Promise<AnnotationResult<F>>;

  /** A shortcut for `(await compile(uri)).annotateJson(json, options)` */
  annotateJson: <F extends OutputFormat = "FLAG">(uri: string, json: string, options?: ValidationOptions<F>) => Promise<AnnotationResult<F>>;
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
};

export type ValidationOptions<F extends OutputFormat = OutputFormat> = {
  output?: F;
};

/**
 * The output format determines what's included in `errors`. Augment this
 * interface to add an output format.
 *
 * ```ts
 * declare module "@hyperjump/json-schema" {
 *   interface OutputFormats {
 *     MY_FORMAT: { valid: boolean; errors: MyError[] };
 *   }
 * }
 * ```
 */
// TODO: Registering an output format's implementation depends on the evaluation plugin design
// TODO: Support the output format being developed for the next spec release
export interface OutputFormats {
  /**
   * Only whether the instance is valid. It's a plain boolean rather than an
   * object so the fastest path doesn't allocate anything.
   */
  FLAG: boolean;

  /** A flat list of every error */
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
}

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
