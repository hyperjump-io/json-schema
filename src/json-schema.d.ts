import type { Hyperjump, HyperjumpConfig } from "@hyperjump/browser";
import type { Json } from "@hyperjump/browser/json";
import type { JsonSchemaNode } from "./schema/schema-ast.d.ts";
import type { Keyword } from "./keyword.d.ts";
import type { Dialect, DialectConfig, DialectExtension, Vocabulary, VocabularyConfig } from "./dialect.d.ts";
import type { Format } from "./format.d.ts";
import type { SchemaRegistry } from "./registry/schema-registry.d.ts";
import type { JsonSchemaSession, SessionOptions } from "./session.d.ts";

export { outputErrorMessage, toVFileMessage } from "./output/validation-error.js";
export { SchemaError } from "./schema/schema-error.js";
export { RetrievalNotAllowedError } from "@hyperjump/browser";
export type { ValidationError, DetailedValidationError } from "./output/validation-error.js";
export type { SchemaMessage } from "./schema/schema-error.js";
export type { BasicOutput, DetailedOutput, OutputError, OutputFormat, JsonSyntaxError } from "./output/output-format.d.ts";

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
   * @throws Error if the keyword isn't in the config or a dialect.
   */
  getKeyword(uri: string): Keyword;

  /** Whether there's a format definition with this URI */
  hasFormat(uri: string): boolean;

  /**
   * Get a format definition.
   *
   * @throws Error if the format isn't in the config or a dialect.
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
