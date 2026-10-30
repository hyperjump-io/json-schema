import { Hyperjump } from "@hyperjump/browser";
import { toAbsoluteIri } from "@hyperjump/uri";
import { JsonSchemaMediaTypePlugin } from "./schema/media-type-plugin.js";
import { withResolvedUris } from "./kernel/kernel-uris.js";
import { JsonOrSchemaMediaTypePlugin } from "./schema/json-media-type-plugin.js";
import { JsonSchemaSession } from "./session.js";
import { SchemaRegistry } from "./registry/schema-registry.js";
import schemaKeyword from "./keywords/schema.js";
import unknownKeyword, { keywordDefinitionUri } from "./keywords/unknown.js";
import { assertNoReservedKeywords } from "./dialects/extend-dialect.js";
import { Validator } from "./kernel/validator.js";
import { schemaReads, subexpressions } from "./kernel/kernel.js";
import { keywordEvaluate } from "./kernel/fast.js";

export { outputErrorMessage, toVFileMessage } from "./output/validation-error.js";
export { SchemaError } from "./schema/schema-error.js";
export { RetrievalNotAllowedError } from "@hyperjump/browser";
export { extendDialect } from "./dialects/extend-dialect.js";

/**
 * @import { Keyword } from "./keyword.d.ts"
 * @import { Format } from "./format.d.ts"
 * @import { Dialect, DialectConfig, Vocabulary, VocabularyConfig } from "./dialect.d.ts"
 * @import { Expression, Kernel } from "./kernel/kernel.d.ts"
 * @import { JsonSchemaNode } from "./schema/schema-ast.d.ts"
 * @import * as API from "./json-schema.d.ts"
 */

/**
 * @implements API.JsonSchema
 * @augments {Hyperjump<JsonSchemaNode>}
 */
export class JsonSchema extends Hyperjump {
  /** @type API.JsonSchemaConfig */
  #config;

  /** @type Record<string, Keyword> */
  #keywords;

  /** @type Record<string, Format> */
  #formats;

  /** @type Record<string, Dialect> */
  #dialects;

  /** @type Record<string, Vocabulary> */
  #vocabularies;

  /** @type API.JsonSchema["registry"] */
  registry;

  /**
   * @param {API.JsonSchemaConfig} [config]
   */
  constructor(config = {}) {
    super(config);

    this.#config = config;
    this.#keywords = {};
    this.#formats = {};
    this.#dialects = {};
    this.#vocabularies = {};
    this.registry = new SchemaRegistry();

    // The config's definitions come first, so one that replaces a
    // dialect's stays replaced, whatever order the dialects are in
    for (const keyword of config.keywords ?? []) {
      this.#keywords[keyword.uri] = keyword;
    }
    for (const format of config.formats ?? []) {
      this.#formats[format.uri] = format;
    }

    // Every dialect has these
    this.#addKeyword(schemaKeyword);
    this.#addKeyword(unknownKeyword);

    for (const uri in config.vocabularies) {
      this.#vocabularies[toAbsoluteIri(uri)] = this.#addVocabulary(config.vocabularies[uri]);
    }
    for (const dialect of config.dialects ?? []) {
      this.#addDialect(dialect);
    }

    // A dialect can name a keyword by URI that another dialect or the config
    // defines, so this waits until they're all added
    for (const dialect of Object.values(this.#dialects)) {
      this.#assertDefined(dialect.keywords, `'${dialect.uri}' dialect`);
    }
    for (const uri in this.#vocabularies) {
      this.#assertDefined(this.#vocabularies[uri].keywords, `'${uri}' vocabulary`);
    }

    this.addMediaTypePlugin(new JsonSchemaMediaTypePlugin());
    this.addMediaTypePlugin(new JsonOrSchemaMediaTypePlugin());
  }

  get config() {
    return this.#config;
  }

  /** @type API.JsonSchema["session"] */
  session(options) {
    return new JsonSchemaSession(this, options);
  }

  /** @type API.JsonSchema["hasKeyword"] */
  hasKeyword(uri) {
    return uri in this.#keywords;
  }

  /** @type API.JsonSchema["getKeyword"] */
  getKeyword(uri) {
    if (!(uri in this.#keywords)) {
      throw Error(`The '${uri}' keyword isn't supported. Add it to the dialect or the 'keywords' config.`);
    }

    return this.#keywords[uri];
  }

  /** @type API.JsonSchema["hasFormat"] */
  hasFormat(uri) {
    return uri in this.#formats;
  }

  /** @type API.JsonSchema["getFormat"] */
  getFormat(uri) {
    if (!(uri in this.#formats)) {
      throw Error(`The '${uri}' format isn't supported. Add it to the dialect or the 'formats' config.`);
    }

    return this.#formats[uri];
  }

  /** @type API.JsonSchema["hasDialect"] */
  hasDialect(uri) {
    return toAbsoluteIri(uri) in this.#dialects;
  }

  /** @type API.JsonSchema["getDialect"] */
  getDialect(uri) {
    uri = toAbsoluteIri(uri);
    if (!(uri in this.#dialects)) {
      throw Error(`The '${uri}' dialect isn't defined`);
    }

    return this.#dialects[uri];
  }

  /** @type API.JsonSchema["getVocabulary"] */
  getVocabulary(uri) {
    return this.#vocabularies[toAbsoluteIri(uri)];
  }

  /**
   * Register a definition a dialect or vocabulary brings, unless one with its
   * URI already is, and name it by URI
   *
   * @type (keyword: Keyword<any, any, any> | string) => string
   */
  #addKeyword(keyword) {
    if (typeof keyword === "string") {
      return keyword;
    }
    this.#keywords[keyword.uri] ??= keyword;
    return keyword.uri;
  }

  /** @type (format: Format | string) => string */
  #addFormat(format) {
    if (typeof format === "string") {
      return format;
    }
    this.#formats[format.uri] ??= format;
    return format.uri;
  }

  /** @type (definitions: Record<string, Keyword<any, any, any> | string>) => Record<string, string> */
  #addKeywords(definitions) {
    /** @type Record<string, string> */
    const uris = {};
    for (const name in definitions) {
      uris[name] = this.#addKeyword(definitions[name]);
    }
    return uris;
  }

  /** @type (definitions: Record<string, Format | string>) => Record<string, string> */
  #addFormats(definitions) {
    /** @type Record<string, string> */
    const uris = {};
    for (const name in definitions) {
      uris[name] = this.#addFormat(definitions[name]);
    }
    return uris;
  }

  /** @type (vocabulary: VocabularyConfig) => Vocabulary */
  #addVocabulary({ keywords, formats, assertFormats }) {
    assertNoReservedKeywords(keywords);

    /** @type Vocabulary */
    const vocabulary = { keywords: this.#addKeywords(keywords) };
    if (formats !== undefined) {
      vocabulary.formats = this.#addFormats(formats);
    }
    if (assertFormats !== undefined) {
      vocabulary.assertFormats = assertFormats;
    }
    return vocabulary;
  }

  /**
   * A dialect is kept with its definitions named by URI, which is how
   * everything reads it.
   *
   * @type (dialect: DialectConfig) => void
   */
  #addDialect({ vocabularies, ...dialect }) {
    const uri = toAbsoluteIri(dialect.uri);
    if (uri in this.#dialects) {
      throw Error(`The '${uri}' dialect is in the config more than once`);
    }
    assertNoReservedKeywords(dialect.keywords);

    for (const vocabularyUri in vocabularies) {
      this.#vocabularies[toAbsoluteIri(vocabularyUri)] ??= this.#addVocabulary(vocabularies[vocabularyUri]);
    }

    const { formats, ...rest } = dialect;
    /** @type Dialect */
    const added = { ...rest, uri, keywords: this.#addKeywords(dialect.keywords) };
    if (formats !== undefined) {
      added.formats = this.#addFormats(formats);
    }
    this.#dialects[uri] = added;
  }

  /** @type (keywords: Readonly<Record<string, string>>, definedIn: string) => void */
  #assertDefined(keywords, definedIn) {
    for (const name in keywords) {
      if (!(keywords[name] in this.#keywords)) {
        throw Error(`The ${definedIn} has no definition for the '${keywords[name]}' keyword. Add it to the dialect or the 'keywords' config.`);
      }
    }
  }

  /** @type API.JsonSchema["compile"] */
  async compile(uri, options) {
    return this.session(options).compile(uri);
  }

  /** @type API.JsonSchema["bundle"] */
  async bundle(uri, options) {
    return this.session(options).bundle(uri, options);
  }

  /** @type API.JsonSchema["lint"] */
  async lint(uri, options) {
    return this.session(options).lint(uri, options);
  }

  /** @type API.JsonSchema["restoreValidator"] */
  restoreValidator(compiled, options = {}) {
    const kernel = /** @type Kernel */ (compiled);
    const version = typeof compiled === "object" && compiled !== null && !Array.isArray(compiled) ? kernel.kernel : undefined;
    if (version !== 1) {
      throw Error(`Can't restore a compiled schema in kernel version ${JSON.stringify(version)}. This version of the library only supports version 1.`);
    }

    // Plugins see each keyword's definition, asserting formats are
    // validated with theirs, and escape hatches by their keyword's
    // `evaluate`
    /** @type (expression: Expression) => void */
    const checkDefinitions = (expression) => {
      if (expression.op === "format" && expression.assert) {
        this.getFormat(/** @type string */ (expression.uri));
      } else if (expression.op === "predicate" || expression.op === "opaque") {
        keywordEvaluate(this, expression.keyword);
      }
      subexpressions(expression).forEach(checkDefinitions);
    };

    // What's read is worked out again rather than trusted, because an
    // evaluator that doesn't track what an expression reads fails
    /** @type Kernel["reads"] */
    const reads = { evaluated: [], dynamicScope: [] };
    for (const handle in kernel.schemas) {
      const schema = kernel.schemas[handle];
      if (typeof schema !== "boolean") {
        for (const { keywordUri, expression } of schema.keywords) {
          this.getKeyword(keywordDefinitionUri(keywordUri));
          checkDefinitions(expression);
        }
      }
      for (const state of schemaReads(schema)) {
        reads[state].push(handle);
      }
    }

    return new Validator(this, withResolvedUris({ ...kernel, reads }, options.uri));
  }

  /** @type API.JsonSchema["validate"] */
  async validate(uri, instance, options) {
    return (await this.compile(uri)).validate(instance, options);
  }

  /** @type API.JsonSchema["validateJson"] */
  async validateJson(uri, json, options) {
    return (await this.compile(uri)).validateJson(json, options);
  }

  /** @type API.JsonSchema["annotate"] */
  async annotate(uri, instance, options) {
    return (await this.compile(uri)).annotate(instance, options);
  }

  /** @type API.JsonSchema["annotateJson"] */
  async annotateJson(uri, json, options) {
    return (await this.compile(uri)).annotateJson(json, options);
  }
}
